const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

// Load contract ABIs
const tokenABI = require('../../blockchain/artifacts/contracts/SwaRojgarToken.sol/SwaRojgarToken.json').abi;
const escrowABI = require('../../blockchain/artifacts/contracts/GigEscrow.sol/GigEscrow.json').abi;

class BlockchainService {
    constructor() {
        this.provider = null;
        this.tokenContract = null;
        this.escrowContract = null;
        this.initialized = false;
    }

    /**
     * Initialize blockchain connection
     */
    async initialize() {
        try {
            // Connect to blockchain network
            const rpcUrl = process.env.BLOCKCHAIN_RPC_URL || 'http://127.0.0.1:8545';
            this.provider = new ethers.JsonRpcProvider(rpcUrl);

            // Get contract addresses from environment
            const tokenAddress = process.env.TOKEN_CONTRACT_ADDRESS;
            const escrowAddress = process.env.ESCROW_CONTRACT_ADDRESS;

            if (!tokenAddress || !escrowAddress) {
                console.warn('⚠️  Contract addresses not set in environment variables');
                console.warn('   Please deploy contracts and update .env file');
                return false;
            }

            // Initialize contract instances
            this.tokenContract = new ethers.Contract(tokenAddress, tokenABI, this.provider);
            this.escrowContract = new ethers.Contract(escrowAddress, escrowABI, this.provider);

            // Test connection
            const network = await this.provider.getNetwork();
            console.log('✅ Blockchain connected:', network.name, `(Chain ID: ${network.chainId})`);
            console.log('📝 Token Contract:', tokenAddress);
            console.log('📝 Escrow Contract:', escrowAddress);

            this.initialized = true;
            return true;
        } catch (error) {
            console.error('❌ Blockchain initialization failed:', error.message);
            return false;
        }
    }

    /**
     * Get SRT token balance for an address
     */
    async getTokenBalance(address) {
        try {
            if (!this.initialized) await this.initialize();

            const balance = await this.tokenContract.balanceOf(address);
            return ethers.formatEther(balance);
        } catch (error) {
            console.error('Error getting token balance:', error);
            throw error;
        }
    }

    /**
     * Get gig details from blockchain
     */
    async getGig(gigId) {
        try {
            if (!this.initialized) await this.initialize();

            const gig = await this.escrowContract.getGig(gigId);

            return {
                gigId: gig.gigId,
                customer: gig.customer,
                freelancer: gig.freelancer,
                amount: ethers.formatEther(gig.amount),
                status: this.getStatusName(Number(gig.status)),
                ipfsHash: gig.ipfsHash,
                createdAt: Number(gig.createdAt),
                deadline: Number(gig.deadline)
            };
        } catch (error) {
            console.error('Error getting gig:', error);
            throw error;
        }
    }

    /**
     * Get status name from enum value
     */
    getStatusName(statusValue) {
        const statuses = ['OPEN', 'ASSIGNED', 'PROOF_SUBMITTED', 'COMPLETED', 'DISPUTED', 'CANCELLED'];
        return statuses[statusValue] || 'UNKNOWN';
    }

    /**
     * Create wallet signer from private key (for server-side transactions)
     */
    getServerSigner() {
        const privateKey = process.env.ADMIN_PRIVATE_KEY;
        if (!privateKey) {
            throw new Error('ADMIN_PRIVATE_KEY not set in environment');
        }
        return new ethers.Wallet(privateKey, this.provider);
    }

    /**
     * Listen to contract events
     */
    async listenToEvents(eventHandlers) {
        if (!this.initialized) await this.initialize();

        // Listen to GigCreated events
        this.escrowContract.on('GigCreated', (gigId, customer, amount, deadline, event) => {
            console.log('📢 GigCreated event:', gigId);
            if (eventHandlers.onGigCreated) {
                eventHandlers.onGigCreated({
                    gigId,
                    customer,
                    amount: ethers.formatEther(amount),
                    deadline: Number(deadline),
                    transactionHash: event.log.transactionHash
                });
            }
        });

        // Listen to GigAccepted events
        this.escrowContract.on('GigAccepted', (gigId, freelancer, event) => {
            console.log('📢 GigAccepted event:', gigId);
            if (eventHandlers.onGigAccepted) {
                eventHandlers.onGigAccepted({
                    gigId,
                    freelancer,
                    transactionHash: event.log.transactionHash
                });
            }
        });

        // Listen to ProofSubmitted events
        this.escrowContract.on('ProofSubmitted', (gigId, ipfsHash, event) => {
            console.log('📢 ProofSubmitted event:', gigId);
            if (eventHandlers.onProofSubmitted) {
                eventHandlers.onProofSubmitted({
                    gigId,
                    ipfsHash,
                    transactionHash: event.log.transactionHash
                });
            }
        });

        // Listen to WorkApproved events
        this.escrowContract.on('WorkApproved', (gigId, event) => {
            console.log('📢 WorkApproved event:', gigId);
            if (eventHandlers.onWorkApproved) {
                eventHandlers.onWorkApproved({
                    gigId,
                    transactionHash: event.log.transactionHash
                });
            }
        });

        // Listen to PaymentReleased events
        this.escrowContract.on('PaymentReleased', (gigId, freelancer, amount, platformFee, event) => {
            console.log('📢 PaymentReleased event:', gigId);
            if (eventHandlers.onPaymentReleased) {
                eventHandlers.onPaymentReleased({
                    gigId,
                    freelancer,
                    amount: ethers.formatEther(amount),
                    platformFee: ethers.formatEther(platformFee),
                    transactionHash: event.log.transactionHash
                });
            }
        });

        console.log('👂 Listening to blockchain events...');
    }

    /**
     * Stop listening to events
     */
    stopListening() {
        if (this.escrowContract) {
            this.escrowContract.removeAllListeners();
            console.log('🔇 Stopped listening to blockchain events');
        }
    }
}

// Export singleton instance
module.exports = new BlockchainService();
