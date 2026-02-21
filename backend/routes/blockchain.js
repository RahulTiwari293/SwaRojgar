const express = require('express');
const router = express.Router();
const multer = require('multer');
const blockchainService = require('../blockchain/blockchainService');
const pinataService = require('../blockchain/pinataService');
const Gig = require('../models/Gig');

// Configure multer for file uploads (memory storage for IPFS)
const upload = multer({ storage: multer.memoryStorage() });

/**
 * GET /api/blockchain/balance/:address
 * Get SRT token balance for a wallet address
 */
router.get('/balance/:address', async (req, res) => {
    try {
        const { address } = req.params;
        const balance = await blockchainService.getTokenBalance(address);

        res.json({
            address,
            balance,
            symbol: 'SRT'
        });
    } catch (error) {
        console.error('Error getting balance:', error);
        res.status(500).json({ message: 'Error getting token balance', error: error.message });
    }
});

/**
 * POST /api/blockchain/gig/create
 * Create gig in database (blockchain transaction done from frontend)
 */
router.post('/gig/create', async (req, res) => {
    try {
        const { gigId, title, description, customerId, customerWallet, amount, deadline, txHash } = req.body;

        // Create gig in database
        const gig = new Gig({
            gigId,
            title,
            description,
            customerId,
            customerWallet,
            amount,
            status: 'OPEN',
            blockchainTxHash: txHash,
            deadline: deadline ? new Date(deadline * 1000) : null
        });

        await gig.save();

        res.status(201).json({
            message: 'Gig created successfully',
            gig
        });
    } catch (error) {
        console.error('Error creating gig:', error);
        res.status(500).json({ message: 'Error creating gig', error: error.message });
    }
});

/**
 * POST /api/blockchain/gig/:gigId/accept
 * Update gig when freelancer accepts (blockchain transaction done from frontend)
 */
router.post('/gig/:gigId/accept', async (req, res) => {
    try {
        const { gigId } = req.params;
        const { freelancerId, freelancerWallet, txHash } = req.body;

        const gig = await Gig.findOne({ gigId });
        if (!gig) {
            return res.status(404).json({ message: 'Gig not found' });
        }

        gig.freelancerId = freelancerId;
        gig.freelancerWallet = freelancerWallet;
        gig.status = 'ASSIGNED';
        gig.blockchainTxHash = txHash;

        await gig.save();

        res.json({
            message: 'Gig accepted successfully',
            gig
        });
    } catch (error) {
        console.error('Error accepting gig:', error);
        res.status(500).json({ message: 'Error accepting gig', error: error.message });
    }
});

/**
 * POST /api/blockchain/gig/:gigId/submit-proof
 * Upload proof files to IPFS and update gig
 */
router.post('/gig/:gigId/submit-proof', upload.array('proofFiles', 10), async (req, res) => {
    try {
        const { gigId } = req.params;
        const { description } = req.body;
        const files = req.files;

        if (!files || files.length === 0) {
            return res.status(400).json({ message: 'No files uploaded' });
        }

        const gig = await Gig.findOne({ gigId });
        if (!gig) {
            return res.status(404).json({ message: 'Gig not found' });
        }

        // Prepare files for IPFS upload
        const ipfsFiles = files.map(file => ({
            data: file.buffer,
            name: file.originalname
        }));

        let ipfsResult;
        try {
            // Try to upload to IPFS via Pinata
            ipfsResult = await pinataService.uploadMultipleFiles(ipfsFiles, {
                gigId,
                description,
                freelancer: gig.freelancerWallet
            });
        } catch (pinataError) {
            console.warn('⚠️  Pinata upload failed, using mock IPFS hash for testing:', pinataError.message);

            // MOCK IPFS UPLOAD FOR TESTING
            // Generate a deterministic hash based on gigId and timestamp
            const crypto = require('crypto');
            const mockHash = crypto.createHash('sha256')
                .update(`${gigId}-${Date.now()}-${files.length}`)
                .digest('hex')
                .substring(0, 46); // IPFS hashes are typically 46 chars

            ipfsResult = {
                ipfsHash: `Qm${mockHash}`, // IPFS hashes start with Qm
                url: `https://gateway.pinata.cloud/ipfs/Qm${mockHash}`,
                fileCount: files.length,
                isMock: true
            };

            console.log('📝 Mock IPFS hash generated:', ipfsResult.ipfsHash);
        }

        // Update gig with IPFS hash
        gig.ipfsProofHash = ipfsResult.ipfsHash;
        gig.proofMetadata = {
            fileCount: files.length,
            uploadedAt: new Date(),
            description,
            isMockUpload: ipfsResult.isMock || false
        };
        gig.status = 'PROOF_SUBMITTED';

        await gig.save();

        res.json({
            message: ipfsResult.isMock
                ? 'Proof uploaded successfully (mock IPFS for testing)'
                : 'Proof uploaded successfully',
            ipfsHash: ipfsResult.ipfsHash,
            ipfsUrl: ipfsResult.url,
            isMock: ipfsResult.isMock || false,
            gig
        });
    } catch (error) {
        console.error('❌ Error submitting proof:', error);
        console.error('Error details:', error.response?.data || error.message);

        // Check if it's a Pinata API error
        if (error.message && error.message.includes('Pinata')) {
            return res.status(500).json({
                message: 'IPFS upload failed. Please check Pinata API configuration.',
                error: error.message
            });
        }

        res.status(500).json({
            message: 'Error uploading proof',
            error: error.message,
            details: error.response?.data?.message || 'Unknown error'
        });
    }
});

/**
 * GET /api/blockchain/gig/:gigId/proof
 * Get proof files URL from IPFS
 */
router.get('/gig/:gigId/proof', async (req, res) => {
    try {
        const { gigId } = req.params;

        const gig = await Gig.findOne({ gigId });
        if (!gig) {
            return res.status(404).json({ message: 'Gig not found' });
        }

        if (!gig.ipfsProofHash) {
            return res.status(404).json({ message: 'No proof submitted yet' });
        }

        const ipfsUrl = pinataService.getFileUrl(gig.ipfsProofHash);

        res.json({
            ipfsHash: gig.ipfsProofHash,
            ipfsUrl,
            metadata: gig.proofMetadata
        });
    } catch (error) {
        console.error('Error getting proof:', error);
        res.status(500).json({ message: 'Error retrieving proof', error: error.message });
    }
});

/**
 * POST /api/blockchain/gig/:gigId/approve
 * Update gig when customer approves (blockchain transaction done from frontend)
 */
router.post('/gig/:gigId/approve', async (req, res) => {
    try {
        const { gigId } = req.params;
        const { txHash } = req.body;

        const gig = await Gig.findOne({ gigId });
        if (!gig) {
            return res.status(404).json({ message: 'Gig not found' });
        }

        gig.status = 'COMPLETED';
        gig.blockchainTxHash = txHash;

        await gig.save();

        res.json({
            message: 'Work approved and payment released',
            gig
        });
    } catch (error) {
        console.error('Error approving work:', error);
        res.status(500).json({ message: 'Error approving work', error: error.message });
    }
});

/**
 * POST /api/blockchain/gig/:gigId/reject
 * Update gig when customer rejects (raises dispute)
 */
router.post('/gig/:gigId/reject', async (req, res) => {
    try {
        const { gigId } = req.params;
        const { reason, txHash } = req.body;

        const gig = await Gig.findOne({ gigId });
        if (!gig) {
            return res.status(404).json({ message: 'Gig not found' });
        }

        gig.status = 'DISPUTED';
        gig.blockchainTxHash = txHash;

        await gig.save();

        res.json({
            message: 'Work rejected, dispute raised',
            gig
        });
    } catch (error) {
        console.error('Error rejecting work:', error);
        res.status(500).json({ message: 'Error rejecting work', error: error.message });
    }
});

/**
 * GET /api/blockchain/gig/:gigId/status
 * Get gig status from blockchain
 */
router.get('/gig/:gigId/status', async (req, res) => {
    try {
        const { gigId } = req.params;

        // Get from blockchain
        const blockchainGig = await blockchainService.getGig(gigId);

        // Get from database
        const dbGig = await Gig.findOne({ gigId })
            .populate('customerId', 'firstName lastName email')
            .populate('freelancerId', 'firstName lastName email');

        res.json({
            blockchain: blockchainGig,
            database: dbGig
        });
    } catch (error) {
        console.error('Error getting gig status:', error);
        res.status(500).json({ message: 'Error getting gig status', error: error.message });
    }
});

/**
 * GET /api/blockchain/gigs/user/:userId
 * Get all gigs for a user (as customer or freelancer)
 */
router.get('/gigs/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { role } = req.query; // 'customer' or 'freelancer'

        let query = {};
        if (role === 'customer') {
            query.customerId = userId;
        } else if (role === 'freelancer') {
            query.freelancerId = userId;
        } else {
            query = {
                $or: [
                    { customerId: userId },
                    { freelancerId: userId }
                ]
            };
        }

        const gigs = await Gig.find(query)
            .populate('customerId', 'firstName lastName email')
            .populate('freelancerId', 'firstName lastName email')
            .sort({ createdAt: -1 });

        res.json({ gigs });
    } catch (error) {
        console.error('Error getting user gigs:', error);
        res.status(500).json({ message: 'Error getting gigs', error: error.message });
    }
});

module.exports = router;
