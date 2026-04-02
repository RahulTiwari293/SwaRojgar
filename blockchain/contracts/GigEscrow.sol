// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IArbitrator.sol";
import "./interfaces/IArbitrable.sol";
import "./interfaces/IEvidence.sol";

/**
 * @title GigEscrow — 3-Tier Dispute Resolution
 * @author SwaRojgar
 * @notice Escrow for gig payments with a 3-tier dispute resolution system:
 *         Tier 1: AI Bot (off-chain LLM agent, verdict submitted by backend)
 *         Tier 2: Kleros (ERC-792/ERC-1497 decentralized court)
 *         Tier 3: Human Admin (multisig / platform owner as final fail-safe)
 *
 * Happy Path:   OPEN → ASSIGNED → PROOF_SUBMITTED → COMPLETED
 * Dispute Path: PROOF_SUBMITTED → DISPUTED_AI → DISPUTED_KLEROS → DISPUTED_HUMAN → RESOLVED
 *
 * @dev Security: ReentrancyGuard on all state-changing money functions.
 *      Kleros `rule()` is only callable by the registered arbitrator address.
 */
contract GigEscrow is ReentrancyGuard, Ownable, IArbitrable, IEvidence {

    // =========================================================================
    // STATE VARIABLES
    // =========================================================================

    /// @notice SwaRojgar ERC-20 Token used for escrow payments.
    IERC20 public srtToken;

    /// @notice The Kleros Court arbitrator contract (Sepolia: 0x90992fb4E15ce0C59aEFfb376460Fda4Ee19C879)
    IArbitrator public arbitrator;

    /**
     * @notice ABI-encoded sub-court ID and number of jurors for Kleros.
     * @dev Encode with: abi.encode(uint96(subCourtId), uint96(numberOfJurors))
     *      e.g. abi.encode(0, 3) → General court, 3 jurors
     */
    bytes public arbitratorExtraData;

    /// @notice Platform fee in basis points (200 = 2%).
    uint256 public platformFeePercent = 200;
    uint256 public constant FEE_DENOMINATOR = 10000;

    /// @notice Address that receives platform fees.
    address public feeCollector;

    /// @notice Global counter used as unique MetaEvidence IDs per ERC-1497.
    uint256 public metaEvidenceCount;

    /// @notice Auto-incrementing gig number for human-readable reference (Gig #1, #2...)
    uint256 public gigCounter;

    // =========================================================================
    // ENUMS & STRUCTS
    // =========================================================================

    enum GigStatus {
        OPEN,             // Gig created, awaiting freelancer
        ASSIGNED,         // Freelancer accepted the gig
        PROOF_SUBMITTED,  // Freelancer submitted proof-of-work (IPFS)
        DISPUTED_AI,      // Tier 1: AI bot is reviewing the dispute
        DISPUTED_KLEROS,  // Tier 2: Escalated to Kleros Court
        DISPUTED_HUMAN,   // Tier 3: Escalated to human/multisig admin
        COMPLETED,        // Resolved — funds paid to freelancer
        REFUNDED          // Resolved — funds returned to client
    }

    struct Gig {
        // Core info
        string gigId;           // Unique identifier (mirrors MongoDB ObjectId)
        uint256 gigNumber;      // Sequential human-readable number (Gig #1, #2, #3...)
        address client;         // The client who posted the gig
        address freelancer;     // The freelancer who accepted the gig
        uint256 amount;         // Total SRT tokens held in escrow
        GigStatus status;       // Current lifecycle state
        uint256 createdAt;      // Block timestamp of gig creation
        uint256 deadline;       // Optional deadline (0 = none)

        // Proof
        string proofIpfsHash;   // IPFS hash of freelancer's proof-of-work
        string metaEvidenceUri; // IPFS URI of ERC-1497 MetaEvidence JSON

        // Tier 1: AI Resolution
        string aiProposalUri;       // IPFS URI of the AI's verdict JSON
        bool clientAcceptsAI;       // Has the client voted to accept AI verdict?
        bool freelancerAcceptsAI;   // Has the freelancer voted to accept AI verdict?

        // Tier 2: Kleros Resolution
        uint256 metaEvidenceID;     // The ERC-1497 metaEvidenceID emitted at creation
        uint256 klerosDisputeId;    // Dispute ID assigned by Kleros Court
        bool hasKlerosDispute;      // True once Kleros dispute is created
        uint256 klerosRuling;       // 0=unresolved, 1=payFreelancer, 2=refundClient
    }

    /// @dev Primary storage: keccak256(gigId) → Gig
    mapping(bytes32 => Gig) public gigs;

    /// @dev Reverse lookup for Kleros callback: Kleros disputeId → gigHash
    mapping(uint256 => bytes32) public disputeIdToGigHash;

    // =========================================================================
    // EVENTS
    // =========================================================================

    // --- Lifecycle ---
    event GigCreated(string indexed gigId, address indexed client, uint256 amount, uint256 deadline, uint256 gigNumber);
    event GigAccepted(string indexed gigId, address indexed freelancer);
    event ProofSubmitted(string indexed gigId, string ipfsHash);
    event WorkApproved(string indexed gigId);
    event PaymentReleased(string indexed gigId, address indexed to, uint256 amount, uint256 fee);

    // --- Dispute ---
    event DisputeRaisedAI(string indexed gigId, address indexed raisedBy);
    event AIProposalSet(string indexed gigId, string proposalIpfsUri);
    event AIVoteCast(string indexed gigId, address indexed voter, bool accepted);
    event DisputeEscalatedKleros(string indexed gigId, uint256 klerosDisputeId, uint256 arbitrationCostPaid);
    event EvidenceSubmitted(string indexed gigId, address indexed party, string evidenceUri);
    event DisputeEscalatedHuman(string indexed gigId, string reason);
    event GigResolved(string indexed gigId, bool paidToFreelancer, uint8 tier);

    // =========================================================================
    // MODIFIERS
    // =========================================================================

    modifier gigExists(string memory _gigId) {
        require(
            gigs[keccak256(bytes(_gigId))].client != address(0),
            "GigEscrow: Gig does not exist"
        );
        _;
    }

    modifier onlyParty(string memory _gigId) {
        Gig storage gig = gigs[keccak256(bytes(_gigId))];
        require(
            msg.sender == gig.client || msg.sender == gig.freelancer,
            "GigEscrow: Caller is not a party to this gig"
        );
        _;
    }

    // =========================================================================
    // CONSTRUCTOR
    // =========================================================================

    /**
     * @param _srtToken          Address of the SwaRojgar ERC-20 token.
     * @param _arbitrator        Address of the Kleros Court arbitrator.
     * @param _arbitratorExtraData ABI-encoded (subCourtId, numberOfJurors).
     */
    constructor(
        address _srtToken,
        address _arbitrator,
        bytes memory _arbitratorExtraData
    ) Ownable(msg.sender) {
        require(_srtToken != address(0), "GigEscrow: Invalid token address");
        require(_arbitrator != address(0), "GigEscrow: Invalid arbitrator address");

        srtToken = IERC20(_srtToken);
        arbitrator = IArbitrator(_arbitrator);
        arbitratorExtraData = _arbitratorExtraData;
        feeCollector = msg.sender;
    }

    // =========================================================================
    // HAPPY PATH
    // =========================================================================

    /**
     * @notice Client creates a gig and locks SRT tokens into escrow.
     * @dev Emits MetaEvidence per ERC-1497 to link the dispute context to IPFS.
     * @param _gigId           Unique gig ID (must match MongoDB/backend ID).
     * @param _amount          SRT tokens to lock in escrow.
     * @param _deadline        Unix timestamp deadline (0 = no deadline).
     * @param _metaEvidenceUri IPFS URI of the MetaEvidence JSON (ERC-1497).
     */
    function createGig(
        string memory _gigId,
        uint256 _amount,
        uint256 _deadline,
        string memory _metaEvidenceUri
    ) external nonReentrant {
        bytes32 gigHash = keccak256(bytes(_gigId));

        require(bytes(_gigId).length > 0, "GigEscrow: Invalid gig ID");
        require(_amount > 0, "GigEscrow: Amount must be > 0");
        require(gigs[gigHash].client == address(0), "GigEscrow: Gig already exists");
        require(bytes(_metaEvidenceUri).length > 0, "GigEscrow: MetaEvidence URI required");

        // Pull tokens from client into escrow
        require(
            srtToken.transferFrom(msg.sender, address(this), _amount),
            "GigEscrow: Token transfer failed — did you approve?"
        );

        uint256 evidenceId = metaEvidenceCount++;
        uint256 gigNum = ++gigCounter; // Start at 1

        gigs[gigHash] = Gig({
            gigId: _gigId,
            gigNumber: gigNum,
            client: msg.sender,
            freelancer: address(0),
            amount: _amount,
            status: GigStatus.OPEN,
            createdAt: block.timestamp,
            deadline: _deadline,
            proofIpfsHash: "",
            metaEvidenceUri: _metaEvidenceUri,
            aiProposalUri: "",
            clientAcceptsAI: false,
            freelancerAcceptsAI: false,
            metaEvidenceID: evidenceId,
            klerosDisputeId: 0,
            hasKlerosDispute: false,
            klerosRuling: 0
        });

        // ERC-1497: Emit MetaEvidence so Kleros UI can find the case context
        emit MetaEvidence(evidenceId, _metaEvidenceUri);
        emit GigCreated(_gigId, msg.sender, _amount, _deadline, gigNum);
    }

    /**
     * @notice Freelancer accepts an open gig.
     */
    function acceptGig(string memory _gigId)
        external
        gigExists(_gigId)
    {
        Gig storage gig = gigs[keccak256(bytes(_gigId))];
        require(gig.status == GigStatus.OPEN, "GigEscrow: Gig not open");
        require(msg.sender != gig.client, "GigEscrow: Client cannot accept own gig");

        gig.freelancer = msg.sender;
        gig.status = GigStatus.ASSIGNED;

        emit GigAccepted(_gigId, msg.sender);
    }

    /**
     * @notice Freelancer submits proof-of-work as an IPFS hash.
     * @dev Also emits an ERC-1497 Evidence event so Kleros can track the proof.
     */
    function submitProof(string memory _gigId, string memory _ipfsHash)
        external
        gigExists(_gigId)
    {
        Gig storage gig = gigs[keccak256(bytes(_gigId))];
        require(gig.status == GigStatus.ASSIGNED, "GigEscrow: Gig not in ASSIGNED state");
        require(msg.sender == gig.freelancer, "GigEscrow: Only assigned freelancer");
        require(bytes(_ipfsHash).length > 0, "GigEscrow: Invalid IPFS hash");

        gig.proofIpfsHash = _ipfsHash;
        gig.status = GigStatus.PROOF_SUBMITTED;

        emit ProofSubmitted(_gigId, _ipfsHash);

        // ERC-1497: Record proof as evidence in case of future Kleros dispute
        emit Evidence(
            address(arbitrator),
            gig.metaEvidenceID,
            msg.sender,
            string(abi.encodePacked("/ipfs/", _ipfsHash))
        );
    }

    /**
     * @notice Client approves work — releases payment to freelancer immediately.
     */
    function approveWork(string memory _gigId)
        external
        nonReentrant
        gigExists(_gigId)
    {
        Gig storage gig = gigs[keccak256(bytes(_gigId))];
        require(msg.sender == gig.client, "GigEscrow: Only client can approve");
        require(gig.status == GigStatus.PROOF_SUBMITTED, "GigEscrow: Proof not yet submitted");

        gig.status = GigStatus.COMPLETED;
        emit WorkApproved(_gigId);
        _releaseToFreelancer(_gigId);
    }

    // =========================================================================
    // TIER 1: AI DISPUTE RESOLUTION
    // =========================================================================

    /**
     * @notice Either party raises a dispute — AI bot is triggered (off-chain).
     * @dev Backend listens for DisputeRaisedAI event and calls the LLM pipeline.
     */
    function raiseDisputeAI(string memory _gigId)
        external
        gigExists(_gigId)
        onlyParty(_gigId)
    {
        Gig storage gig = gigs[keccak256(bytes(_gigId))];
        require(gig.status == GigStatus.PROOF_SUBMITTED, "GigEscrow: Can only dispute after proof submission");

        gig.status = GigStatus.DISPUTED_AI;
        emit DisputeRaisedAI(_gigId, msg.sender);
    }

    /**
     * @notice Backend submits the AI's verdict (as an IPFS URI) to the contract.
     * @dev Only the platform owner (backend signer) can call this.
     *      The URI points to a JSON: { ruling, confidence, reasoning, suggestedSplit }
     */
    function setAIProposal(string memory _gigId, string memory _proposalUri)
        external
        onlyOwner
        gigExists(_gigId)
    {
        Gig storage gig = gigs[keccak256(bytes(_gigId))];
        require(gig.status == GigStatus.DISPUTED_AI, "GigEscrow: Not in AI dispute state");
        require(bytes(_proposalUri).length > 0, "GigEscrow: Invalid proposal URI");

        gig.aiProposalUri = _proposalUri;
        emit AIProposalSet(_gigId, _proposalUri);
    }

    /**
     * @notice Each party votes to accept or reject the AI's proposed verdict.
     * @dev If BOTH accept → funds released (pay freelancer by default).
     *      If either rejects → they can call escalateToKleros().
     * @param _accept True = accept AI verdict, False = reject (will escalate).
     */
    function voteOnAIProposal(string memory _gigId, bool _accept)
        external
        nonReentrant
        gigExists(_gigId)
        onlyParty(_gigId)
    {
        Gig storage gig = gigs[keccak256(bytes(_gigId))];
        require(gig.status == GigStatus.DISPUTED_AI, "GigEscrow: Not in AI dispute state");
        require(bytes(gig.aiProposalUri).length > 0, "GigEscrow: AI proposal not yet submitted");

        if (msg.sender == gig.client) {
            gig.clientAcceptsAI = _accept;
        } else {
            gig.freelancerAcceptsAI = _accept;
        }
        emit AIVoteCast(_gigId, msg.sender, _accept);

        // Mutual acceptance → pay freelancer (AI validated the work)
        if (gig.clientAcceptsAI && gig.freelancerAcceptsAI) {
            gig.status = GigStatus.COMPLETED;
            _releaseToFreelancer(_gigId);
            emit GigResolved(_gigId, true, 1);
        }
        // Rejection: no automatic action; either party can now call escalateToKleros()
    }

    // =========================================================================
    // TIER 2: KLEROS DECENTRALIZED ARBITRATION
    // =========================================================================

    /**
     * @notice Escalates the dispute to Kleros Court if AI resolution was rejected.
     * @dev Caller must send exactly `arbitrationCost()` ETH to cover Kleros fees.
     *      Excess ETH is refunded. Emits ERC-1497 Dispute event.
     */
    function escalateToKleros(string memory _gigId)
        external
        payable
        nonReentrant
        gigExists(_gigId)
        onlyParty(_gigId)
    {
        Gig storage gig = gigs[keccak256(bytes(_gigId))];
        require(gig.status == GigStatus.DISPUTED_AI, "GigEscrow: Must be in AI dispute to escalate");
        require(!gig.hasKlerosDispute, "GigEscrow: Kleros dispute already raised");

        uint256 cost = arbitrator.arbitrationCost(arbitratorExtraData);
        require(msg.value >= cost, "GigEscrow: Insufficient ETH for arbitration fee");

        // Create the Kleros dispute. 2 choices: 1=PayFreelancer, 2=RefundClient
        uint256 disputeId = arbitrator.createDispute{value: cost}(2, arbitratorExtraData);

        bytes32 gigHash = keccak256(bytes(_gigId));
        gig.klerosDisputeId = disputeId;
        gig.hasKlerosDispute = true;
        gig.status = GigStatus.DISPUTED_KLEROS;
        disputeIdToGigHash[disputeId] = gigHash;

        // ERC-1497: Emit Dispute event linking this Kleros dispute to our MetaEvidence
        emit Dispute(address(arbitrator), disputeId, gig.metaEvidenceID, gig.metaEvidenceID);
        emit DisputeEscalatedKleros(_gigId, disputeId, cost);

        // Refund any excess ETH to caller
        if (msg.value > cost) {
            (bool success, ) = payable(msg.sender).call{value: msg.value - cost}("");
            require(success, "GigEscrow: ETH refund failed");
        }
    }

    /**
     * @notice Either party submits additional evidence to Kleros during the dispute.
     * @dev Evidence JSON must be uploaded to IPFS first via backend.
     *      Emits ERC-1497 Evidence event that Kleros UI displays to jurors.
     * @param _evidenceUri IPFS URI of the evidence JSON (e.g., "/ipfs/Qm...")
     */
    function submitEvidenceToKleros(string memory _gigId, string memory _evidenceUri)
        external
        gigExists(_gigId)
        onlyParty(_gigId)
    {
        Gig storage gig = gigs[keccak256(bytes(_gigId))];
        require(gig.status == GigStatus.DISPUTED_KLEROS, "GigEscrow: Not in Kleros dispute");
        require(bytes(_evidenceUri).length > 0, "GigEscrow: Invalid evidence URI");

        // ERC-1497: Emit Evidence event — Kleros jurors will see this
        emit Evidence(address(arbitrator), gig.metaEvidenceID, msg.sender, _evidenceUri);
        emit EvidenceSubmitted(_gigId, msg.sender, _evidenceUri);
    }

    /**
     * @notice Called ONLY by the Kleros Court arbitrator to deliver the final ruling.
     * @dev ERC-792 required function. Reverts if caller is not the registered arbitrator.
     *      Ruling 0 = Refuse to Arbitrate → escalates to Tier 3 (Human)
     *      Ruling 1 = Pay Freelancer → releases escrow to freelancer
     *      Ruling 2 = Refund Client → returns tokens to client
     */
    function rule(uint256 _disputeId, uint256 _ruling)
        external
        override
        nonReentrant
    {
        require(msg.sender == address(arbitrator), "GigEscrow: Only Kleros arbitrator can call rule()");

        bytes32 gigHash = disputeIdToGigHash[_disputeId];
        Gig storage gig = gigs[gigHash];

        require(gig.hasKlerosDispute, "GigEscrow: No Kleros dispute found for this ID");
        require(gig.status == GigStatus.DISPUTED_KLEROS, "GigEscrow: Not in Kleros dispute state");

        gig.klerosRuling = _ruling;

        if (_ruling == 1) {
            // Kleros ruled: Pay the freelancer
            gig.status = GigStatus.COMPLETED;
            _releaseToFreelancer(gig.gigId);
            emit GigResolved(gig.gigId, true, 2);
        } else if (_ruling == 2) {
            // Kleros ruled: Refund the client
            gig.status = GigStatus.REFUNDED;
            _refundClient(gig.gigId);
            emit GigResolved(gig.gigId, false, 2);
        } else {
            // Ruling 0: Kleros refused to arbitrate → escalate to human admin
            gig.status = GigStatus.DISPUTED_HUMAN;
            emit DisputeEscalatedHuman(gig.gigId, "Kleros refused to arbitrate (ruling=0)");
        }

        // ERC-792: Emit Ruling event
        emit Ruling(address(arbitrator), _disputeId, _ruling);
    }

    // =========================================================================
    // TIER 3: HUMAN / MULTISIG FINAL ARBITRATION
    // =========================================================================

    /**
     * @notice Platform admin makes the final irrevocable decision.
     * @dev This should be protected by a Gnosis Safe multisig in production.
     *      Only reachable when Kleros returns ruling=0 (refuse to arbitrate) OR
     *      in extreme edge cases (contract bug, Kleros downtime, etc.).
     * @param _releaseToFreelancer True = pay freelancer, False = refund client.
     */
    function humanFinalArbitration(string memory _gigId, bool _releaseToFreelancer)
        external
        onlyOwner
        nonReentrant
        gigExists(_gigId)
    {
        Gig storage gig = gigs[keccak256(bytes(_gigId))];
        require(
            gig.status == GigStatus.DISPUTED_HUMAN,
            "GigEscrow: Only callable in DISPUTED_HUMAN state"
        );

        if (_releaseToFreelancer) {
            gig.status = GigStatus.COMPLETED;
            _releaseToFreelancer(_gigId);
            emit GigResolved(_gigId, true, 3);
        } else {
            gig.status = GigStatus.REFUNDED;
            _refundClient(_gigId);
            emit GigResolved(_gigId, false, 3);
        }
    }

    // =========================================================================
    // INTERNAL HELPERS
    // =========================================================================

    function _releaseToFreelancer(string memory _gigId) private {
        Gig storage gig = gigs[keccak256(bytes(_gigId))];
        uint256 fee = (gig.amount * platformFeePercent) / FEE_DENOMINATOR;
        uint256 payout = gig.amount - fee;

        require(srtToken.transfer(gig.freelancer, payout), "GigEscrow: Freelancer payment failed");
        if (fee > 0) {
            require(srtToken.transfer(feeCollector, fee), "GigEscrow: Fee transfer failed");
        }

        emit PaymentReleased(_gigId, gig.freelancer, payout, fee);
    }

    function _refundClient(string memory _gigId) private {
        Gig storage gig = gigs[keccak256(bytes(_gigId))];
        require(srtToken.transfer(gig.client, gig.amount), "GigEscrow: Client refund failed");
        emit PaymentReleased(_gigId, gig.client, gig.amount, 0);
    }

    // =========================================================================
    // VIEW FUNCTIONS
    // =========================================================================

    /// @notice Returns the current Kleros arbitration cost in ETH.
    function getArbitrationCost() external view returns (uint256) {
        return arbitrator.arbitrationCost(arbitratorExtraData);
    }

    /// @notice Returns full gig data for a given gigId.
    function getGig(string memory _gigId) external view returns (Gig memory) {
        bytes32 gigHash = keccak256(bytes(_gigId));
        require(gigs[gigHash].client != address(0), "GigEscrow: Gig does not exist");
        return gigs[gigHash];
    }

    // =========================================================================
    // ADMIN FUNCTIONS
    // =========================================================================

    function setPlatformFee(uint256 _newFeePercent) external onlyOwner {
        require(_newFeePercent <= 1000, "GigEscrow: Fee cannot exceed 10%");
        platformFeePercent = _newFeePercent;
    }

    function setFeeCollector(address _newCollector) external onlyOwner {
        require(_newCollector != address(0), "GigEscrow: Invalid address");
        feeCollector = _newCollector;
    }

    function setArbitrator(address _newArbitrator, bytes calldata _newExtraData) external onlyOwner {
        require(_newArbitrator != address(0), "GigEscrow: Invalid arbitrator");
        arbitrator = IArbitrator(_newArbitrator);
        arbitratorExtraData = _newExtraData;
    }

    /// @notice Emergency ETH withdrawal (Kleros fee refunds may accumulate here)
    function withdrawETH() external onlyOwner {
        (bool success, ) = payable(owner()).call{value: address(this).balance}("");
        require(success, "GigEscrow: ETH withdrawal failed");
    }

    /// @notice Accept ETH for arbitration fee payments
    receive() external payable {}
}
