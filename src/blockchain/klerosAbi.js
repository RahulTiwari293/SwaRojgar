/**
 * klerosAbi.js — Contract ABIs for SwaRojgar 3-Tier Dispute System
 *
 * Contains:
 *   - ESCROW_ABI: Full ABI for the updated GigEscrow (3-tier)
 *   - ARBITRATOR_ABI: Minimal IArbitrator ABI for reading arbitrationCost()
 *
 * Usage:
 *   import { ESCROW_ABI, ARBITRATOR_ABI, CONTRACT_ADDRESSES } from './klerosAbi';
 */

export const CONTRACT_ADDRESSES = {
    // Ethereum Sepolia Testnet
    escrow: import.meta.env.VITE_ESCROW_CONTRACT_ADDRESS || "0x5996AD515E407F1569278a1642cE9f259c1010eA",
    token:  import.meta.env.VITE_TOKEN_CONTRACT_ADDRESS  || "0xfdA41C31D6630980352F590c753E9Ee5E2964906",

    // Kleros Court on Sepolia — used only for reading arbitrationCost()
    klerosCourt: "0x90992fb4E15ce0C59aEFfb376460Fda4Ee19C879",
};

// ─── GigEscrow ABI (3-Tier Dispute) ──────────────────────────────────────────
export const ESCROW_ABI = [
    // ── Happy Path ───────────────────────────────────────────────────────────
    "function createGig(string gigId, uint256 amount, uint256 deadline, string metaEvidenceUri) external",
    "function acceptGig(string gigId) external",
    "function submitProof(string gigId, string ipfsHash) external",
    "function approveWork(string gigId) external",
    "function getGig(string gigId) view returns (tuple(string gigId, uint256 gigNumber, address client, address freelancer, uint256 amount, uint8 status, uint256 createdAt, uint256 deadline, string proofIpfsHash, string metaEvidenceUri, string aiProposalUri, bool clientAcceptsAI, bool freelancerAcceptsAI, uint256 metaEvidenceID, uint256 klerosDisputeId, bool hasKlerosDispute, uint256 klerosRuling))",

    // ── Tier 1: AI Dispute ───────────────────────────────────────────────────
    "function raiseDisputeAI(string gigId) external",
    "function voteOnAIProposal(string gigId, bool accept) external",

    // ── Tier 2: Kleros ───────────────────────────────────────────────────────
    "function escalateToKleros(string gigId) external payable",
    "function submitEvidenceToKleros(string gigId, string evidenceUri) external",
    "function getArbitrationCost() view returns (uint256)",

    // ── Tier 3: Human Admin ──────────────────────────────────────────────────
    "function humanFinalArbitration(string gigId, bool releaseToFreelancer) external",

    // ── Events ───────────────────────────────────────────────────────────────
    "event GigCreated(string indexed gigId, address indexed client, uint256 amount, uint256 deadline, uint256 gigNumber)",
    "event GigAccepted(string indexed gigId, address indexed freelancer)",
    "event ProofSubmitted(string indexed gigId, string ipfsHash)",
    "event WorkApproved(string indexed gigId)",
    "event PaymentReleased(string indexed gigId, address indexed to, uint256 amount, uint256 fee)",

    "event DisputeRaisedAI(string indexed gigId, address indexed raisedBy)",
    "event AIProposalSet(string indexed gigId, string proposalIpfsUri)",
    "event AIVoteCast(string indexed gigId, address indexed voter, bool accepted)",

    "event DisputeEscalatedKleros(string indexed gigId, uint256 klerosDisputeId, uint256 arbitrationCostPaid)",
    "event EvidenceSubmitted(string indexed gigId, address indexed party, string evidenceUri)",
    "event DisputeEscalatedHuman(string indexed gigId, string reason)",
    "event GigResolved(string indexed gigId, bool paidToFreelancer, uint8 tier)",

    // ERC-1497
    "event MetaEvidence(uint256 indexed metaEvidenceID, string evidence)",
    "event Dispute(address indexed arbitrator, uint256 indexed disputeID, uint256 metaEvidenceID, uint256 evidenceGroupID)",
    "event Evidence(address indexed arbitrator, uint256 indexed evidenceGroupID, address indexed party, string evidence)",

    // ERC-792
    "event Ruling(address indexed arbitrator, uint256 indexed disputeID, uint256 ruling)",
];

// ─── SwaRojgar Token ABI (ERC-20 relevant functions) ─────────────────────────
export const TOKEN_ABI = [
    "function balanceOf(address account) view returns (uint256)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function transfer(address to, uint256 amount) returns (bool)",
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)",
    "event Approval(address indexed owner, address indexed spender, uint256 value)",
    "event Transfer(address indexed from, address indexed to, uint256 value)",
];

// ─── IArbitrator ABI (Kleros Court — read-only) ───────────────────────────────
export const ARBITRATOR_ABI = [
    "function arbitrationCost(bytes extraData) view returns (uint256 cost)",
    "function appealCost(uint256 disputeID, bytes extraData) view returns (uint256 cost)",
    "function appealPeriod(uint256 disputeID) view returns (uint256 start, uint256 end)",
    "function disputeStatus(uint256 disputeID) view returns (uint8 status)",
    "function currentRuling(uint256 disputeID) view returns (uint256 ruling)",
];

// ─── GigStatus enum (mirrors contract) ───────────────────────────────────────
export const GigStatus = {
    0: "OPEN",
    1: "ASSIGNED",
    2: "PROOF_SUBMITTED",
    3: "DISPUTED_AI",
    4: "DISPUTED_KLEROS",
    5: "DISPUTED_HUMAN",
    6: "COMPLETED",
    7: "REFUNDED",
};

// ─── Kleros extraData (subCourt=0, jurors=3) ──────────────────────────────────
// Pre-encoded: abi.encode(uint96(0), uint96(3))
export const KLEROS_EXTRA_DATA = "0x0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000003";
