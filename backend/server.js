require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const Post = require('./models/Post');
const postRoutes = require('./routes/posts');
const blockchainRoutes = require('./routes/blockchain');
const disputeRoutes = require('./routes/dispute');
const blockchainService = require('./blockchain/blockchainService');
const { startEventListener } = require('./services/aiResolutionService');
const bcrypt = require('bcrypt');
const { generateToken, authMiddleware } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 5010;

// CORS — whitelist frontend origins
const allowedOrigins = [
    'http://localhost:5173',  // Vite dev server
    'http://localhost:5174',  // Vite dev server (fallback port)
    'http://localhost:4173',  // Vite preview
    process.env.FRONTEND_URL, // production URL (set in .env / Fly secrets)
].filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (Postman, server-to-server)
        if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
        callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
}));

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// MongoDB connection — cached for serverless (Vercel reuses connections across requests)
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/swarojgar';

let mongoConnected = false;
async function connectMongo() {
    if (mongoConnected || mongoose.connection.readyState === 1) return;
    try {
        await mongoose.connect(MONGODB_URI);
        mongoConnected = true;
        console.log("✅ MongoDB connected:", mongoose.connection.name);
    } catch (err) {
        console.error("❌ MongoDB connection error:", err.message);
        throw err;
    }
}

// Middleware to ensure DB is connected before every request (required for Vercel serverless)
app.use(async (req, res, next) => {
    try {
        await connectMongo();
        next();
    } catch (err) {
        res.status(503).json({ message: 'Database unavailable', error: err.message });
    }
});

// Multer: memory storage for Vercel compatibility (no persistent filesystem)
const User = require('./models/User');
const uploadPost    = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const uploadProfile = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5  * 1024 * 1024 } });

// Static file serving — only in local dev (Vercel has no filesystem)
if (process.env.NODE_ENV !== 'production') {
    app.use('/uploads', express.static('uploads'));
}

// Use the post routes
app.use('/api/posts', postRoutes);

// Use the blockchain routes
app.use('/api/blockchain', blockchainRoutes);

// Use the dispute routes (3-tier: AI → Kleros → Human)
app.use('/api/dispute', disputeRoutes);

// Signup route
app.post('/signup', async (req, res) => {
    const { firstName, lastName, email, phoneNumber, password, userType } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
        firstName,
        lastName,
        email,
        phoneNumber,
        password: hashedPassword,
        userType
    });

    try {
        await newUser.save();
        const token = generateToken(newUser._id, newUser.userType);
        res.status(201).json({
            message: 'User registered successfully',
            token,
            userId: newUser._id,
            userType: newUser.userType
        });
        console.log("REGISTERED");
    } catch (error) {
        console.error("Error saving user data:", error);

        // Check if error is due to duplicate email
        if (error.code === 11000 && error.keyPattern && error.keyPattern.email) {
            return res.status(400).json({
                message: 'Email already exists. Please use a different email or login.'
            });
        }

        res.status(500).json({
            message: 'Error saving user data',
            error: error.message
        });
    }
});

// Login route
app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        // Find user by email
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // Compare provided password with hashed password
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (isPasswordValid) {
            const token = generateToken(user._id, user.userType);
            res.status(200).json({
                message: 'Login successful',
                token,
                userId: user._id,
                userType: user.userType,
                firstName: user.firstName,
                lastName: user.lastName,
                profilePhoto: user.profilePhoto,
                walletAddress: user.walletAddress
            });
            console.log("LOGIN SUCCESSFUL");
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
            console.log("LOGIN FAILED - Invalid password");
        }
    } catch (error) {
        console.error("Error during login:", error);
        res.status(500).json({ message: 'Error during login', error });
    }
});

// Profile photo upload endpoint
app.post('/api/users/:userId/profile-photo', uploadProfile.single('profilePhoto'), async (req, res) => {
    try {
        const { userId } = req.params;

        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const profilePhotoPath = 'uploads/profiles/' + req.file.filename;

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { profilePhoto: profilePhotoPath },
            { new: true, select: '-password' }
        );

        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({
            message: 'Profile photo uploaded successfully',
            user: updatedUser
        });
    } catch (error) {
        console.error('Error uploading profile photo:', error);
        res.status(500).json({ message: 'Error uploading profile photo', error: error.message });
    }
});

// Get user profile endpoint
app.get('/api/users/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await User.findById(userId).select('-password');
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.status(200).json(user);
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ message: 'Error fetching user', error: error.message });
    }
});

// ─── Save wallet address for a user ──────────────────────────────────────────
// Called when user connects MetaMask — links wallet to their account
app.patch('/api/users/:userId/wallet', async (req, res) => {
    try {
        const { userId } = req.params;
        const { walletAddress } = req.body;
        if (!walletAddress) return res.status(400).json({ message: 'walletAddress is required' });

        const user = await User.findByIdAndUpdate(
            userId,
            { walletAddress: walletAddress.toLowerCase() },
            { new: true, select: '-password' }
        );
        if (!user) return res.status(404).json({ message: 'User not found' });

        res.json({ message: 'Wallet address saved', walletAddress: user.walletAddress });
    } catch (error) {
        res.status(500).json({ message: 'Error saving wallet', error: error.message });
    }
});

// ─── Update user profile (bio, skills, etc.) ─────────────────────────────────
app.patch('/api/users/:userId/profile', async (req, res) => {
    try {
        const { userId } = req.params;
        const { bio, skills, hourlyRate, portfolio, firstName, lastName, phoneNumber } = req.body;

        const updates = {};
        if (bio !== undefined)        updates.bio        = bio;
        if (skills !== undefined)     updates.skills     = skills;
        if (hourlyRate !== undefined) updates.hourlyRate = hourlyRate;
        if (portfolio !== undefined)  updates.portfolio  = portfolio;
        if (firstName)                updates.firstName  = firstName;
        if (lastName)                 updates.lastName   = lastName;
        if (phoneNumber)              updates.phoneNumber = phoneNumber;

        const user = await User.findByIdAndUpdate(userId, updates, { new: true, select: '-password' });
        if (!user) return res.status(404).json({ message: 'User not found' });

        res.json({ message: 'Profile updated', user });
    } catch (error) {
        res.status(500).json({ message: 'Error updating profile', error: error.message });
    }
});



// ===== CLERK AUTH SYNC =====
// Called after every Clerk sign-in/sign-up to sync the Clerk user to MongoDB.
// Verifies the Clerk session token, then finds-or-creates the MongoDB user.
// Returns our own JWT so the rest of the app can stay unchanged.
app.post('/api/users/clerk-sync', async (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'No Clerk token provided' });
        }
        const clerkToken = authHeader.slice(7);

        // Verify with Clerk SDK
        const { verifyToken, createClerkClient } = require('@clerk/backend');
        const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

        let clerkUser;
        try {
            const payload = await verifyToken(clerkToken, { secretKey: process.env.CLERK_SECRET_KEY });
            clerkUser = await clerk.users.getUser(payload.sub);
        } catch (err) {
            return res.status(401).json({ message: 'Invalid Clerk token' });
        }

        const email      = clerkUser.emailAddresses?.[0]?.emailAddress;
        const firstName  = clerkUser.firstName || '';
        const lastName   = clerkUser.lastName  || '';
        const { userType } = req.body; // passed on first signup (onboarding)

        if (!email) return res.status(400).json({ message: 'No email on Clerk account' });

        // Find or create MongoDB user
        let user = await User.findOne({ email });
        const isNew = !user;

        if (isNew) {
            if (!userType) {
                // New user — needs onboarding (role selection)
                return res.status(202).json({ needsOnboarding: true, email, firstName, lastName });
            }
            const hashedPassword = await bcrypt.hash(clerkUser.id, 10); // unusable password
            user = new User({ firstName, lastName, email, phoneNumber: '', password: hashedPassword, userType });
            await user.save();
        }

        // Issue our JWT
        const token = generateToken(user._id, user.userType);
        res.json({
            token,
            userId:      user._id,
            userType:    user.userType,
            firstName:   user.firstName,
            lastName:    user.lastName,
            profilePhoto: user.profilePhoto,
            walletAddress: user.walletAddress,
        });
    } catch (error) {
        console.error('Clerk sync error:', error.message);
        res.status(500).json({ message: 'Sync failed', error: error.message });
    }
});

// ===== SRT FAUCET =====
// Mints 1000 SRT to a wallet address — testnet only, admin-key protected.
// Called from the frontend "Get Test SRT" button.
app.post('/api/faucet', async (req, res) => {
    try {
        const { walletAddress, adminKey } = req.body;
        if (!walletAddress) return res.status(400).json({ message: 'walletAddress is required' });

        // Simple rate-limiting by admin key — replace with per-wallet cooldown in prod
        if (adminKey !== process.env.ADMIN_SECRET) {
            return res.status(403).json({ message: 'Forbidden — invalid admin key' });
        }

        const { ethers } = require('ethers');
        const provider = new ethers.JsonRpcProvider(process.env.BLOCKCHAIN_RPC_URL);
        const signer   = new ethers.Wallet(process.env.BLOCKCHAIN_PRIVATE_KEY, provider);
        const tokenABI = ['function mint(address to, uint256 amount) external'];
        const token    = new ethers.Contract(process.env.TOKEN_CONTRACT_ADDRESS, tokenABI, signer);

        const amount = ethers.parseEther('1000'); // 1000 SRT per request
        const tx     = await token.mint(walletAddress, amount);
        const receipt = await tx.wait();

        res.json({ message: '1000 SRT minted successfully', txHash: receipt.hash, walletAddress });
    } catch (error) {
        console.error('Faucet error:', error.message);
        res.status(500).json({ message: 'Faucet failed', error: error.message });
    }
});

// ===== JOB MANAGEMENT ENDPOINTS =====

// Accept a job (freelancer applies)
app.patch('/api/jobs/:jobId/accept', authMiddleware, async (req, res) => {
    try {
        const { jobId } = req.params;
        const { freelancerId, freelancerWallet, txHash } = req.body;

        const post = await Post.findById(jobId);
        if (!post) {
            return res.status(404).json({ message: 'Job not found' });
        }

        if (post.status !== 'OPEN') {
            return res.status(400).json({ message: 'Job is not available' });
        }

        post.status = 'ASSIGNED';
        post.assignedFreelancer = freelancerId;
        post.freelancerWallet = freelancerWallet;
        post.blockchainTxHash = txHash;

        await post.save();

        res.json({
            message: 'Job accepted successfully',
            job: post
        });
    } catch (error) {
        console.error('Error accepting job:', error);
        res.status(500).json({ message: 'Failed to accept job', error: error.message });
    }
});

// Get available jobs for freelancers (public — no auth required for browsing)
app.get('/api/jobs/available', async (req, res) => {
    try {
        const jobs = await Post.find({
            postType: 'job',
            status: 'OPEN'
        })
            .populate('userId', 'firstName lastName profilePhoto')
            .sort({ createdAt: -1 });

        res.json(jobs);
    } catch (error) {
        console.error('Error fetching available jobs:', error);
        res.status(500).json({ message: 'Failed to fetch jobs', error: error.message });
    }
});

// Get freelancer's assigned jobs
app.get('/api/jobs/freelancer/:userId', authMiddleware, async (req, res) => {
    try {
        const { userId } = req.params;

        const jobs = await Post.find({
            assignedFreelancer: userId,
            postType: 'job'
        })
            .populate('userId', 'firstName lastName profilePhoto')
            .sort({ createdAt: -1 });

        res.json(jobs);
    } catch (error) {
        console.error('Error fetching freelancer jobs:', error);
        res.status(500).json({ message: 'Failed to fetch jobs', error: error.message });
    }
});

// Get customer's posted jobs
app.get('/api/jobs/customer/:userId', authMiddleware, async (req, res) => {
    try {
        const { userId } = req.params;

        const jobs = await Post.find({
            userId: userId,
            postType: 'job'
        })
            .populate('assignedFreelancer', 'firstName lastName profilePhoto')
            .sort({ createdAt: -1 });

        res.json(jobs);
    } catch (error) {
        console.error('Error fetching customer jobs:', error);
        res.status(500).json({ message: 'Failed to fetch jobs', error: error.message });
    }
});

// Update job status
app.patch('/api/jobs/:jobId/status', authMiddleware, async (req, res) => {
    try {
        const { jobId } = req.params;
        const { status, proofIpfsHash, proofDescription, txHash } = req.body;

        const post = await Post.findById(jobId);
        if (!post) {
            return res.status(404).json({ message: 'Job not found' });
        }

        post.status = status;

        if (proofIpfsHash) {
            post.proofIpfsHash = proofIpfsHash;
            post.proofDescription = proofDescription;
            post.submittedAt = new Date();
        }

        if (status === 'COMPLETED') {
            post.completedAt = new Date();
        }

        if (txHash) {
            post.blockchainTxHash = txHash;
        }

        await post.save();

        res.json({
            message: 'Job status updated successfully',
            job: post
        });
    } catch (error) {
        console.error('Error updating job status:', error);
        res.status(500).json({ message: 'Failed to update job status', error: error.message });
    }
});

// Get job details with proof
app.get('/api/jobs/:jobId/details', authMiddleware, async (req, res) => {
    try {
        const { jobId } = req.params;

        const job = await Post.findById(jobId)
            .populate('userId', 'firstName lastName profilePhoto email')
            .populate('assignedFreelancer', 'firstName lastName profilePhoto email');

        if (!job) {
            return res.status(404).json({ message: 'Job not found' });
        }

        res.json(job);
    } catch (error) {
        console.error('Error fetching job details:', error);
        res.status(500).json({ message: 'Failed to fetch job details', error: error.message });
    }
});

// ===== SERVER START =====

// Initialize blockchain service
// AI event listener is disabled on Vercel (serverless) — use manual trigger endpoint instead:
// POST /api/dispute/:gigId/ai-trigger
blockchainService.initialize()
    .then(() => {
        console.log('✅ Blockchain connected on Sepolia');
        console.log('📝 Token Contract:', process.env.TOKEN_CONTRACT_ADDRESS);
        console.log('📝 Escrow Contract:', process.env.ESCROW_CONTRACT_ADDRESS);

        // Only start event listener in non-serverless environments
        if (process.env.ENABLE_EVENT_LISTENER === 'true' &&
            process.env.GROK_API_KEY && process.env.BLOCKCHAIN_PRIVATE_KEY) {
            startEventListener()
                .then(() => console.log('🤖 AI Dispute Resolver: listening for events'))
                .catch(err => console.error('⚠️  AI event listener failed to start:', err.message));
        } else {
            console.log('ℹ️  AI event listener disabled — use POST /api/dispute/:gigId/ai-trigger to resolve disputes manually');
        }
    })
    .catch(err => {
        console.error('⚠️  Blockchain connection failed:', err.message);
        console.log('Server will continue without blockchain features');
    });

// Local dev: start server normally
// Vercel: exports app as a serverless function handler
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`\n🚀 Server running on http://localhost:${PORT}\n`);
    });
}

module.exports = app;