// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title GigEscrow
 * @dev Automated escrow system for SwaRojgar gig marketplace
 * 
 * Workflow:
 * 1. Customer creates gig and deposits SRT tokens
 * 2. Freelancer accepts gig
 * 3. Freelancer submits proof-of-work (IPFS hash)
 * 4. Customer approves → automatic payment release
 * 5. Customer rejects → dispute resolution by admin
 */
contract GigEscrow is ReentrancyGuard, Ownable {
    
    // SwaRojgar Token contract
    IERC20 public srtToken;
    
    // Gig status enum
    enum GigStatus {
        OPEN,              // Gig created, waiting for freelancer
        ASSIGNED,          // Freelancer accepted
        PROOF_SUBMITTED,   // Proof uploaded to IPFS
        COMPLETED,         // Work approved, payment released
        DISPUTED,          // Customer rejected, needs admin resolution
        CANCELLED          // Gig cancelled, funds refunded
    }
    
    // Gig structure
    struct Gig {
        string gigId;           // Unique gig identifier (from MongoDB)
        address customer;       // Customer who posted the gig
        address freelancer;     // Freelancer assigned to gig
        uint256 amount;         // Escrow amount in SRT tokens
        GigStatus status;       // Current gig status
        string ipfsHash;        // IPFS hash of proof-of-work
        uint256 createdAt;      // Timestamp of gig creation
        uint256 deadline;       // Optional deadline for completion
    }
    
    // Mapping from gigId to Gig
    mapping(string => Gig) public gigs;
    
    // Platform fee percentage (e.g., 2% = 200 basis points)
    uint256 public platformFeePercent = 200; // 2%
    uint256 public constant FEE_DENOMINATOR = 10000;
    
    // Platform fee collector address
    address public feeCollector;
    
    // Events
    event GigCreated(string indexed gigId, address indexed customer, uint256 amount, uint256 deadline);
    event GigAccepted(string indexed gigId, address indexed freelancer);
    event ProofSubmitted(string indexed gigId, string ipfsHash);
    event WorkApproved(string indexed gigId);
    event PaymentReleased(string indexed gigId, address indexed freelancer, uint256 amount, uint256 platformFee);
    event WorkRejected(string indexed gigId, string reason);
    event DisputeResolved(string indexed gigId, bool releasedToFreelancer);
    event GigCancelled(string indexed gigId);
    
    /**
     * @dev Constructor
     * @param _srtToken Address of SwaRojgar Token contract
     */
    constructor(address _srtToken) Ownable(msg.sender) {
        require(_srtToken != address(0), "Invalid token address");
        srtToken = IERC20(_srtToken);
        feeCollector = msg.sender;
    }
    
    /**
     * @dev Create a new gig with escrow deposit
     * @param _gigId Unique gig identifier
     * @param _amount Amount of SRT tokens to escrow
     * @param _deadline Optional deadline timestamp (0 for no deadline)
     */
    function createGig(
        string memory _gigId,
        uint256 _amount,
        uint256 _deadline
    ) external nonReentrant {
        require(bytes(_gigId).length > 0, "Invalid gig ID");
        require(_amount > 0, "Amount must be greater than 0");
        require(gigs[_gigId].customer == address(0), "Gig already exists");
        
        // Transfer tokens from customer to this contract
        require(
            srtToken.transferFrom(msg.sender, address(this), _amount),
            "Token transfer failed"
        );
        
        // Create gig
        gigs[_gigId] = Gig({
            gigId: _gigId,
            customer: msg.sender,
            freelancer: address(0),
            amount: _amount,
            status: GigStatus.OPEN,
            ipfsHash: "",
            createdAt: block.timestamp,
            deadline: _deadline
        });
        
        emit GigCreated(_gigId, msg.sender, _amount, _deadline);
    }
    
    /**
     * @dev Freelancer accepts a gig
     * @param _gigId Gig identifier
     */
    function acceptGig(string memory _gigId) external {
        Gig storage gig = gigs[_gigId];
        
        require(gig.customer != address(0), "Gig does not exist");
        require(gig.status == GigStatus.OPEN, "Gig is not open");
        require(msg.sender != gig.customer, "Customer cannot accept own gig");
        
        gig.freelancer = msg.sender;
        gig.status = GigStatus.ASSIGNED;
        
        emit GigAccepted(_gigId, msg.sender);
    }
    
    /**
     * @dev Freelancer submits proof-of-work IPFS hash
     * @param _gigId Gig identifier
     * @param _ipfsHash IPFS hash of proof files
     */
    function submitProof(string memory _gigId, string memory _ipfsHash) external {
        Gig storage gig = gigs[_gigId];
        
        require(gig.customer != address(0), "Gig does not exist");
        require(gig.status == GigStatus.ASSIGNED, "Gig is not assigned");
        require(msg.sender == gig.freelancer, "Only assigned freelancer can submit proof");
        require(bytes(_ipfsHash).length > 0, "Invalid IPFS hash");
        
        gig.ipfsHash = _ipfsHash;
        gig.status = GigStatus.PROOF_SUBMITTED;
        
        emit ProofSubmitted(_gigId, _ipfsHash);
    }
    
    /**
     * @dev Customer approves work and triggers automatic payment
     * @param _gigId Gig identifier
     */
    function approveWork(string memory _gigId) external nonReentrant {
        Gig storage gig = gigs[_gigId];
        
        require(gig.customer != address(0), "Gig does not exist");
        require(msg.sender == gig.customer, "Only customer can approve");
        require(gig.status == GigStatus.PROOF_SUBMITTED, "Proof not submitted yet");
        
        gig.status = GigStatus.COMPLETED;
        
        emit WorkApproved(_gigId);
        
        // Release payment to freelancer
        _releasePayment(_gigId);
    }
    
    /**
     * @dev Customer rejects work and raises dispute
     * @param _gigId Gig identifier
     * @param _reason Reason for rejection
     */
    function rejectWork(string memory _gigId, string memory _reason) external {
        Gig storage gig = gigs[_gigId];
        
        require(gig.customer != address(0), "Gig does not exist");
        require(msg.sender == gig.customer, "Only customer can reject");
        require(gig.status == GigStatus.PROOF_SUBMITTED, "Proof not submitted yet");
        
        gig.status = GigStatus.DISPUTED;
        
        emit WorkRejected(_gigId, _reason);
    }
    
    /**
     * @dev Admin resolves dispute
     * @param _gigId Gig identifier
     * @param _releaseToFreelancer True to release payment to freelancer, false to refund customer
     */
    function resolveDispute(string memory _gigId, bool _releaseToFreelancer) external onlyOwner nonReentrant {
        Gig storage gig = gigs[_gigId];
        
        require(gig.customer != address(0), "Gig does not exist");
        require(gig.status == GigStatus.DISPUTED, "Gig is not disputed");
        
        if (_releaseToFreelancer) {
            gig.status = GigStatus.COMPLETED;
            _releasePayment(_gigId);
        } else {
            gig.status = GigStatus.CANCELLED;
            // Refund customer
            require(
                srtToken.transfer(gig.customer, gig.amount),
                "Refund failed"
            );
        }
        
        emit DisputeResolved(_gigId, _releaseToFreelancer);
    }
    
    /**
     * @dev Cancel gig before it's assigned (customer only)
     * @param _gigId Gig identifier
     */
    function cancelGig(string memory _gigId) external nonReentrant {
        Gig storage gig = gigs[_gigId];
        
        require(gig.customer != address(0), "Gig does not exist");
        require(msg.sender == gig.customer, "Only customer can cancel");
        require(gig.status == GigStatus.OPEN, "Can only cancel open gigs");
        
        gig.status = GigStatus.CANCELLED;
        
        // Refund customer
        require(
            srtToken.transfer(gig.customer, gig.amount),
            "Refund failed"
        );
        
        emit GigCancelled(_gigId);
    }
    
    /**
     * @dev Internal function to release payment to freelancer
     * @param _gigId Gig identifier
     */
    function _releasePayment(string memory _gigId) private {
        Gig storage gig = gigs[_gigId];
        
        // Calculate platform fee
        uint256 platformFee = (gig.amount * platformFeePercent) / FEE_DENOMINATOR;
        uint256 freelancerAmount = gig.amount - platformFee;
        
        // Transfer to freelancer
        require(
            srtToken.transfer(gig.freelancer, freelancerAmount),
            "Payment to freelancer failed"
        );
        
        // Transfer platform fee
        if (platformFee > 0) {
            require(
                srtToken.transfer(feeCollector, platformFee),
                "Platform fee transfer failed"
            );
        }
        
        emit PaymentReleased(_gigId, gig.freelancer, freelancerAmount, platformFee);
    }
    
    /**
     * @dev Get gig details
     * @param _gigId Gig identifier
     */
    function getGig(string memory _gigId) external view returns (Gig memory) {
        require(gigs[_gigId].customer != address(0), "Gig does not exist");
        return gigs[_gigId];
    }
    
    /**
     * @dev Update platform fee (owner only)
     * @param _newFeePercent New fee percentage in basis points (e.g., 200 = 2%)
     */
    function setPlatformFee(uint256 _newFeePercent) external onlyOwner {
        require(_newFeePercent <= 1000, "Fee cannot exceed 10%");
        platformFeePercent = _newFeePercent;
    }
    
    /**
     * @dev Update fee collector address (owner only)
     * @param _newCollector New fee collector address
     */
    function setFeeCollector(address _newCollector) external onlyOwner {
        require(_newCollector != address(0), "Invalid address");
        feeCollector = _newCollector;
    }
}
