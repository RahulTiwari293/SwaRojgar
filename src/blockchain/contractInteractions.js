import { ethers } from 'ethers';

// Contract ABIs (simplified - only the functions we need)
const TOKEN_ABI = [
    "function balanceOf(address account) view returns (uint256)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function transfer(address to, uint256 amount) returns (bool)"
];

const ESCROW_ABI = [
    "function createGig(string memory gigId, uint256 amount, uint256 deadline)",
    "function acceptGig(string memory gigId)",
    "function submitProof(string memory gigId, string memory ipfsHash)",
    "function approveWork(string memory gigId)",
    "function rejectWork(string memory gigId, string memory reason)",
    "function cancelGig(string memory gigId)",
    "function getGig(string memory gigId) view returns (tuple(string gigId, address customer, address freelancer, uint256 amount, uint8 status, string ipfsHash, uint256 createdAt, uint256 deadline))",
    "event GigCreated(string indexed gigId, address indexed customer, uint256 amount, uint256 deadline)",
    "event GigAccepted(string indexed gigId, address indexed freelancer)",
    "event ProofSubmitted(string indexed gigId, string ipfsHash)",
    "event WorkApproved(string indexed gigId)",
    "event PaymentReleased(string indexed gigId, address indexed freelancer, uint256 amount, uint256 platformFee)"
];

// Contract addresses (will be set after deployment)
const TOKEN_ADDRESS = import.meta.env.VITE_TOKEN_CONTRACT_ADDRESS || '';
const ESCROW_ADDRESS = import.meta.env.VITE_ESCROW_CONTRACT_ADDRESS || '';

console.log('Contract addresses loaded:', {
    TOKEN_ADDRESS,
    ESCROW_ADDRESS
});

/**
 * Get contract instances
 */
export const getContracts = async () => {
    console.log('getContracts called');

    if (!window.ethereum) {
        throw new Error('MetaMask not installed');
    }

    if (!TOKEN_ADDRESS || !ESCROW_ADDRESS) {
        console.error('Missing contract addresses:', { TOKEN_ADDRESS, ESCROW_ADDRESS });
        throw new Error('Contract addresses not configured. Check your .env file.');
    }

    console.log('Creating provider...');
    const provider = new ethers.BrowserProvider(window.ethereum);

    console.log('Getting signer...');
    const signer = await provider.getSigner();
    console.log('Signer address:', await signer.getAddress());

    console.log('Creating token contract...');
    const tokenContract = new ethers.Contract(TOKEN_ADDRESS, TOKEN_ABI, signer);

    console.log('Creating escrow contract...');
    const escrowContract = new ethers.Contract(ESCROW_ADDRESS, ESCROW_ABI, signer);

    console.log('Contracts created successfully');
    return { tokenContract, escrowContract, provider, signer };
};

/**
 * Get SRT token balance
 */
export const getTokenBalance = async (address) => {
    const { tokenContract } = await getContracts();
    const balance = await tokenContract.balanceOf(address);
    return ethers.formatEther(balance);
};

/**
 * Approve tokens for escrow contract
 */
export const approveTokens = async (amount) => {
    try {
        const { tokenContract } = await getContracts();
        const amountWei = ethers.parseEther(amount.toString());

        const tx = await tokenContract.approve(ESCROW_ADDRESS, amountWei);
        console.log('Approval transaction sent:', tx.hash);

        const receipt = await tx.wait();
        console.log('Tokens approved:', receipt.hash);

        return receipt.hash;
    } catch (error) {
        console.error('Error approving tokens:', error);
        throw error;
    }
};

/**
 * Create gig on blockchain
 */
export const createGigOnChain = async (gigId, amount, deadline = 0) => {
    try {
        console.log('=== Creating gig on chain ===');
        console.log('Input params:', { gigId, amount, deadline });

        // Get contracts
        const { escrowContract, signer } = await getContracts();
        console.log('✓ Got contracts');
        console.log('Escrow contract address:', await escrowContract.getAddress());
        console.log('Signer address:', await signer.getAddress());

        // Convert amount
        const amountWei = ethers.parseEther(amount.toString());
        console.log('✓ Amount in Wei:', amountWei.toString());

        // Check if method exists
        if (typeof escrowContract.createGig !== 'function') {
            throw new Error('createGig method not found on contract');
        }
        console.log('✓ createGig method exists');

        // Call createGig function
        console.log('Calling escrowContract.createGig...');
        console.log('Parameter 1 (gigId):', gigId, 'Type:', typeof gigId);
        console.log('Parameter 2 (amountWei):', amountWei, 'Type:', typeof amountWei);
        console.log('Parameter 3 (deadline):', deadline, 'Type:', typeof deadline);

        // Validate parameters
        if (!gigId || gigId === 'undefined' || gigId === 'null') {
            throw new Error(`Invalid gigId: ${gigId}`);
        }
        if (!amountWei) {
            throw new Error(`Invalid amount: ${amountWei}`);
        }
        if (deadline === undefined || deadline === null) {
            throw new Error(`Invalid deadline: ${deadline}`);
        }

        const tx = await escrowContract.createGig(gigId, amountWei, deadline);
        console.log('✓ Transaction object received:', tx);

        if (!tx) {
            throw new Error('Transaction returned undefined - contract call failed');
        }

        if (!tx.hash) {
            console.error('Transaction object:', tx);
            throw new Error('Transaction has no hash property');
        }

        console.log('✓ Transaction hash:', tx.hash);

        // Wait for transaction
        console.log('Waiting for transaction confirmation...');
        const receipt = await tx.wait();
        console.log('✓ Transaction confirmed!');
        console.log('Receipt:', receipt);

        return receipt.hash;
    } catch (error) {
        console.error('❌ Error creating gig:', error);
        console.error('Error type:', typeof error);
        console.error('Error details:', {
            message: error.message,
            code: error.code,
            reason: error.reason,
            data: error.data
        });
        throw error;
    }
};

/**
 * Accept gig on blockchain
 */
export const acceptGigOnChain = async (gigId) => {
    try {
        const { escrowContract } = await getContracts();

        const tx = await escrowContract.acceptGig(gigId);
        console.log('Accept gig transaction sent:', tx.hash);

        const receipt = await tx.wait();
        console.log('Gig accepted on blockchain:', receipt.hash);

        return receipt.hash;
    } catch (error) {
        console.error('Error accepting gig:', error);
        throw error;
    }
};

/**
 * Submit proof on blockchain
 */
export const submitProofOnChain = async (gigId, ipfsHash) => {
    try {
        const { escrowContract } = await getContracts();

        const tx = await escrowContract.submitProof(gigId, ipfsHash);
        console.log('Submit proof transaction sent:', tx.hash);

        const receipt = await tx.wait();
        console.log('Proof submitted on blockchain:', receipt.hash);

        return receipt.hash;
    } catch (error) {
        console.error('Error submitting proof:', error);
        throw error;
    }
};

/**
 * Approve work and release payment
 */
export const approveWorkOnChain = async (gigId) => {
    try {
        const { escrowContract } = await getContracts();

        const tx = await escrowContract.approveWork(gigId);
        console.log('Approve work transaction sent:', tx.hash);

        const receipt = await tx.wait();
        console.log('Work approved, payment released:', receipt.hash);

        return receipt.hash;
    } catch (error) {
        console.error('Error approving work:', error);
        throw error;
    }
};

/**
 * Reject work and raise dispute
 */
export const rejectWorkOnChain = async (gigId, reason) => {
    try {
        const { escrowContract } = await getContracts();

        const tx = await escrowContract.rejectWork(gigId, reason);
        console.log('Reject work transaction sent:', tx.hash);

        const receipt = await tx.wait();
        console.log('Work rejected, dispute raised:', receipt.hash);

        return receipt.hash;
    } catch (error) {
        console.error('Error rejecting work:', error);
        throw error;
    }
};

/**
 * Cancel gig
 */
export const cancelGigOnChain = async (gigId) => {
    try {
        const { escrowContract } = await getContracts();

        const tx = await escrowContract.cancelGig(gigId);
        console.log('Cancel gig transaction sent:', tx.hash);

        const receipt = await tx.wait();
        console.log('Gig cancelled:', receipt.hash);

        return receipt.hash;
    } catch (error) {
        console.error('Error cancelling gig:', error);
        throw error;
    }
};

/**
 * Get gig details from blockchain
 */
export const getGigFromChain = async (gigId) => {
    try {
        const { escrowContract } = await getContracts();
        const gig = await escrowContract.getGig(gigId);

        return {
            gigId: gig.gigId,
            customer: gig.customer,
            freelancer: gig.freelancer,
            amount: ethers.formatEther(gig.amount),
            status: ['OPEN', 'ASSIGNED', 'PROOF_SUBMITTED', 'COMPLETED', 'DISPUTED', 'CANCELLED'][Number(gig.status)],
            ipfsHash: gig.ipfsHash,
            createdAt: Number(gig.createdAt),
            deadline: Number(gig.deadline)
        };
    } catch (error) {
        console.error('Error getting gig from chain:', error);
        throw error;
    }
};

/**
 * Estimate gas for transaction
 */
export const estimateGas = async (method, ...args) => {
    try {
        const { escrowContract } = await getContracts();
        const gasEstimate = await escrowContract[method].estimateGas(...args);
        return gasEstimate.toString();
    } catch (error) {
        console.error('Error estimating gas:', error);
        return null;
    }
};
