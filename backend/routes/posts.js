/**
 * posts.js — Gig/Post API Routes
 *
 * Endpoints:
 *   POST /api/posts             — Create a new job or experience post
 *   GET  /api/posts             — Get all posts (with filters)
 *   GET  /api/posts/:id         — Get a single post
 *   PATCH /api/posts/:id        — Update a post (status, proof, etc.)
 *   DELETE /api/posts/:id       — Delete a post (owner only)
 */

const express  = require('express');
const multer   = require('multer');
const path     = require('path');
const Post     = require('../models/Post');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// ─── Multer: disk storage for post images ─────────────────────────────────────
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/posts/'),
    filename:    (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
    fileFilter: (req, file, cb) => {
        const allowed = /jpeg|jpg|png|gif|webp|pdf/;
        const ext = allowed.test(path.extname(file.originalname).toLowerCase());
        const mime = allowed.test(file.mimetype);
        if (ext && mime) return cb(null, true);
        cb(new Error('Only images and PDFs are allowed'));
    }
});

// ─── POST /api/posts — Create post ───────────────────────────────────────────
router.post('/', upload.single('image'), async (req, res) => {
    try {
        const {
            userId, title, content, userType, postType,
            // Job-specific
            srtAmount, deadline, walletAddress
        } = req.body;

        if (!userId || !title || !content || !userType || !postType) {
            return res.status(400).json({ message: 'userId, title, content, userType, postType are required' });
        }

        // Enforce business rules
        if (userType === 'client' && postType !== 'job') {
            return res.status(400).json({ message: 'Clients can only create job posts' });
        }
        if (userType === 'freelancer' && postType !== 'experience') {
            return res.status(400).json({ message: 'Freelancers can only create experience posts' });
        }

        const imagePath = req.file ? `uploads/posts/${req.file.filename}` : null;

        const newPost = new Post({
            userId,
            title,
            content,
            userType,
            postType,
            image: imagePath,
            // Save job-specific fields that were missing before
            srtAmount:     srtAmount     ? parseFloat(srtAmount)     : undefined,
            deadline:      deadline      ? parseInt(deadline, 10)    : undefined,
            // Store client wallet for blockchain linkage
            clientWallet:  walletAddress || undefined,
        });

        await newPost.save();

        res.status(201).json({
            message: 'Post created successfully',
            post: newPost,
            gigNumber: newPost.gigNumber  // auto-assigned via pre-save hook
        });
    } catch (error) {
        console.error('Error creating post:', error);
        res.status(500).json({ message: 'Error creating post', error: error.message });
    }
});

// ─── GET /api/posts — Query posts ────────────────────────────────────────────
// Supports: ?postType=job|experience, ?status=OPEN, ?userId=xxx, ?userRole=client|freelancer
router.get('/', async (req, res) => {
    try {
        const { postType, status, userId, userRole, gigNumber } = req.query;
        const filter = {};

        if (postType)    filter.postType = postType;
        if (status)      filter.status   = status;
        if (gigNumber)   filter.gigNumber = parseInt(gigNumber, 10);

        // Role-based filtering: clients see their own posts, freelancers see assigned ones
        if (userId && userRole === 'client') {
            filter.userId = userId;
        } else if (userId && userRole === 'freelancer') {
            filter.assignedFreelancer = userId;
        } else if (userId) {
            filter.userId = userId;
        }

        const posts = await Post.find(filter)
            .populate('userId',             'firstName lastName profilePhoto walletAddress')
            .populate('assignedFreelancer', 'firstName lastName profilePhoto walletAddress')
            .sort({ createdAt: -1 });

        res.status(200).json({ posts, total: posts.length });
    } catch (error) {
        console.error('Error fetching posts:', error);
        res.status(500).json({ message: 'Error fetching posts', error: error.message });
    }
});

// ─── GET /api/posts/:id — Single post ────────────────────────────────────────
router.get('/:id', async (req, res) => {
    try {
        const post = await Post.findById(req.params.id)
            .populate('userId',             'firstName lastName profilePhoto walletAddress email')
            .populate('assignedFreelancer', 'firstName lastName profilePhoto walletAddress email');

        if (!post) return res.status(404).json({ message: 'Post not found' });

        res.json(post);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching post', error: error.message });
    }
});

// ─── PATCH /api/posts/:id — Update post ──────────────────────────────────────
// Used by blockchain event listeners to sync on-chain state to MongoDB
router.patch('/:id', async (req, res) => {
    try {
        const {
            status, proofIpfsHash, proofDescription,
            blockchainTxHash, freelancerId, freelancerWallet,
            disputeTier, aiProposal, klerosDisputeId,
            completedAt
        } = req.body;

        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ message: 'Post not found' });

        // Apply updates selectively
        if (status)            post.status            = status;
        if (proofIpfsHash)     post.proofIpfsHash     = proofIpfsHash;
        if (proofDescription)  post.proofDescription  = proofDescription;
        if (blockchainTxHash)  post.blockchainTxHash  = blockchainTxHash;
        if (freelancerId)      post.assignedFreelancer= freelancerId;
        if (freelancerWallet)  post.freelancerWallet  = freelancerWallet;
        if (disputeTier !== undefined) post.disputeTier       = disputeTier;
        if (aiProposal)                post.aiProposal        = aiProposal;
        if (klerosDisputeId !== undefined) post.klerosDisputeId = klerosDisputeId;

        if (proofIpfsHash) post.submittedAt = new Date();
        if (status === 'COMPLETED' || completedAt) post.completedAt = new Date();

        await post.save();

        res.json({ message: 'Post updated', post });
    } catch (error) {
        console.error('Error updating post:', error);
        res.status(500).json({ message: 'Error updating post', error: error.message });
    }
});

// ─── DELETE /api/posts/:id ────────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
    try {
        const { userId } = req.body;
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ message: 'Post not found' });

        if (post.userId.toString() !== userId) {
            return res.status(403).json({ message: 'You can only delete your own posts' });
        }

        if (['ASSIGNED','PROOF_SUBMITTED'].includes(post.status)) {
            return res.status(400).json({ message: 'Cannot delete a gig that is in progress' });
        }

        await post.deleteOne();
        res.json({ message: 'Post deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting post', error: error.message });
    }
});

module.exports = router;