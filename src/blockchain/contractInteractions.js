/**
 * contractInteractions.js
 *
 * Helper functions for direct contract calls.
 * ABIs and addresses are sourced from klerosAbi.js (single source of truth).
 *
 * NOTE: Most contract calls in the app now go through GigContext.runTx()
 * with inline ethers.Contract instances. These helpers remain for
 * WorkSubmission.jsx and any legacy callers.
 */

import { ethers } from 'ethers';
import { ESCROW_ABI, TOKEN_ABI, CONTRACT_ADDRESSES, GigStatus } from './klerosAbi';

const TOKEN_ADDRESS  = CONTRACT_ADDRESSES.token;
const ESCROW_ADDRESS = CONTRACT_ADDRESSES.escrow;

/**
 * Returns ethers Contract instances connected to the current MetaMask signer.
 */
export const getContracts = async () => {
    if (!window.ethereum) throw new Error('MetaMask not installed');
    if (!TOKEN_ADDRESS || !ESCROW_ADDRESS) {
        throw new Error('Contract addresses not configured. Check your .env file.');
    }

    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer   = await provider.getSigner();

    return {
        tokenContract:  new ethers.Contract(TOKEN_ADDRESS,  TOKEN_ABI,  signer),
        escrowContract: new ethers.Contract(ESCROW_ADDRESS, ESCROW_ABI, signer),
        provider,
        signer,
    };
};

/** SRT token balance for an address (formatted ether string) */
export const getTokenBalance = async (address) => {
    const { tokenContract } = await getContracts();
    const balance = await tokenContract.balanceOf(address);
    return ethers.formatEther(balance);
};

/** Approve escrow contract to spend `amount` SRT */
export const approveTokens = async (amount) => {
    const { tokenContract } = await getContracts();
    const amountWei = ethers.parseEther(amount.toString());
    const tx = await tokenContract.approve(ESCROW_ADDRESS, amountWei);
    const receipt = await tx.wait();
    return receipt.hash;
};

/**
 * Create gig on blockchain.
 * @param {string} gigId           - MongoDB post _id (string)
 * @param {number|string} amount   - SRT amount (human-readable, e.g. "100")
 * @param {number} deadline        - Unix timestamp (0 = no deadline)
 * @param {string} metaEvidenceUri - IPFS URI from POST /api/dispute/upload-meta
 */
export const createGigOnChain = async (gigId, amount, deadline = 0, metaEvidenceUri) => {
    if (!gigId) throw new Error('gigId is required');
    if (!metaEvidenceUri) throw new Error('metaEvidenceUri is required — upload MetaEvidence first');

    const { escrowContract } = await getContracts();
    const amountWei = ethers.parseEther(amount.toString());

    const tx = await escrowContract.createGig(gigId, amountWei, deadline, metaEvidenceUri);
    const receipt = await tx.wait();
    return receipt.hash;
};

/** Freelancer accepts an open gig (transitions OPEN → ASSIGNED on-chain) */
export const acceptGigOnChain = async (gigId) => {
    const { escrowContract } = await getContracts();
    const tx = await escrowContract.acceptGig(gigId);
    const receipt = await tx.wait();
    return receipt.hash;
};

/**
 * Freelancer submits proof-of-work IPFS hash on-chain.
 * @param {string} gigId    - gig ID
 * @param {string} ipfsHash - CID from Pinata upload (without /ipfs/ prefix)
 */
export const submitProofOnChain = async (gigId, ipfsHash) => {
    const { escrowContract } = await getContracts();
    const tx = await escrowContract.submitProof(gigId, ipfsHash);
    const receipt = await tx.wait();
    return receipt.hash;
};

/** Client approves work — releases SRT to freelancer (98%) and fee collector (2%) */
export const approveWorkOnChain = async (gigId) => {
    const { escrowContract } = await getContracts();
    const tx = await escrowContract.approveWork(gigId);
    const receipt = await tx.wait();
    return receipt.hash;
};

/** Either party raises AI dispute (Tier 1) */
export const raiseDisputeAIOnChain = async (gigId) => {
    const { escrowContract } = await getContracts();
    const tx = await escrowContract.raiseDisputeAI(gigId);
    const receipt = await tx.wait();
    return receipt.hash;
};

/** Either party votes to accept/reject the AI proposal */
export const voteOnAIProposalOnChain = async (gigId, accept) => {
    const { escrowContract } = await getContracts();
    const tx = await escrowContract.voteOnAIProposal(gigId, accept);
    const receipt = await tx.wait();
    return receipt.hash;
};

/**
 * Escalate to Kleros Court (Tier 2).
 * Caller must send `arbitrationCost` ETH with the transaction.
 * @param {string} gigId           - gig ID
 * @param {bigint} arbitrationCost - result of getArbitrationCost() (in wei)
 */
export const escalateToKlerosOnChain = async (gigId, arbitrationCost) => {
    const { escrowContract } = await getContracts();
    const tx = await escrowContract.escalateToKleros(gigId, { value: arbitrationCost });
    const receipt = await tx.wait();
    return receipt.hash;
};

/** Read current Kleros arbitration cost in ETH (wei) */
export const getArbitrationCost = async () => {
    const { escrowContract } = await getContracts();
    return escrowContract.getArbitrationCost();
};

/**
 * Fetch full gig data from chain.
 * Returns a plain object with human-readable fields.
 */
export const getGigFromChain = async (gigId) => {
    const { escrowContract } = await getContracts();
    const gig = await escrowContract.getGig(gigId);

    return {
        gigId:               gig.gigId,
        gigNumber:           Number(gig.gigNumber),
        client:              gig.client,
        freelancer:          gig.freelancer,
        amount:              ethers.formatEther(gig.amount),
        status:              GigStatus[Number(gig.status)] || 'UNKNOWN',
        statusIndex:         Number(gig.status),
        createdAt:           Number(gig.createdAt),
        deadline:            Number(gig.deadline),
        proofIpfsHash:       gig.proofIpfsHash,
        metaEvidenceUri:     gig.metaEvidenceUri,
        aiProposalUri:       gig.aiProposalUri,
        clientAcceptsAI:     gig.clientAcceptsAI,
        freelancerAcceptsAI: gig.freelancerAcceptsAI,
        klerosDisputeId:     Number(gig.klerosDisputeId),
        hasKlerosDispute:    gig.hasKlerosDispute,
        klerosRuling:        Number(gig.klerosRuling),
    };
};
