require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const Post = require('./models/Post');
const postRoutes = require('./routes/posts');
const blockchainRoutes = require('./routes/blockchain');
const blockchainService = require('./blockchain/blockchainService');
const bcrypt = require('bcrypt');

const app = express();
const PORT = process.env.PORT || 5010;

// Use CORS middleware
app.use(cors());

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/swarojgar';
console.log('Attempting to connect to MongoDB at:', MONGODB_URI);

mongoose.connect(MONGODB_URI)
    .then(() => {
        console.log("✅ Successfully connected to MongoDB");
        console.log("📊 Database:", mongoose.connection.name);
    })
    .catch(err => {
        console.error("❌ MongoDB connection error:", err.message);
        console.error("Make sure MongoDB is running locally!");
    });

// Set up storage for post images
const postStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/posts/'); // Save post images in the 'uploads/posts' directory
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname)); // Save images with a timestamp to avoid overwriting
    }
});

// Set up storage for profile photos
const profileStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/profiles/'); // Save profile photos in the 'uploads/profiles' directory
    },
    filename: (req, file, cb) => {
        cb(null, 'profile-' + Date.now() + path.extname(file.originalname));
    }
});

const User = require('./models/User');

const uploadPost = multer({ storage: postStorage });
const uploadProfile = multer({ storage: profileStorage });

// Serve static files from the 'uploads' directory
app.use('/uploads', express.static('uploads'));

// Use the post routes
app.use('/api/posts', postRoutes);

// Use the blockchain routes
app.use('/api/blockchain', blockchainRoutes);

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
        res.status(201).json({
            message: 'User registered successfully',
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
            res.status(200).json({
                message: 'Login successful',
                userId: user._id,
                userType: user.userType
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

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json(user);
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ message: 'Error fetching user', error: error.message });
    }
});

// ===== JOB MANAGEMENT ENDPOINTS =====

// Accept a job (freelancer applies)
app.patch('/api/jobs/:jobId/accept', async (req, res) => {
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

// Get available jobs for freelancers (only OPEN jobs)
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
app.get('/api/jobs/freelancer/:userId', async (req, res) => {
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
app.get('/api/jobs/customer/:userId', async (req, res) => {
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
app.patch('/api/jobs/:jobId/status', async (req, res) => {
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
app.get('/api/jobs/:jobId/details', async (req, res) => {
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
blockchainService.initialize()
    .then(() => {
        console.log('✅ Blockchain connected:', blockchainService.getNetworkName(), `(Chain ID: ${blockchainService.getChainId()})`);
        console.log('📝 Token Contract:', process.env.TOKEN_CONTRACT_ADDRESS);
        console.log('📝 Escrow Contract:', process.env.ESCROW_CONTRACT_ADDRESS);
    })
    .catch(err => {
        console.error('⚠️  Blockchain connection failed:', err.message);
        console.log('Server will continue without blockchain features');
    });

// Start the server
app.listen(PORT, () => {
    console.log(`\n🚀 Server is running on port ${PORT}`);
    console.log(`📡 API available at: http://localhost:${PORT}`);

    console.log(`\n Available endpoints:`);
    console.log(`   POST http://localhost:${PORT}/signup`);
    console.log(`   POST http://localhost:${PORT}/login`);
    console.log(`   POST http://localhost:${PORT}/api/posts`);
    console.log(`   GET  http://localhost:${PORT}/api/posts`);
    console.log(`   POST http://localhost:${PORT}/api/users/:userId/profile-photo`);
    console.log(`   GET  http://localhost:${PORT}/api/users/:userId`);

    console.log(`\n Blockchain endpoints:`);
    console.log(`   GET  http://localhost:${PORT}/api/blockchain/balance/:address`);
    console.log(`   POST http://localhost:${PORT}/api/blockchain/gig/create`);
    console.log(`   POST http://localhost:${PORT}/api/blockchain/gig/:gigId/accept`);
    console.log(`   POST http://localhost:${PORT}/api/blockchain/gig/:gigId/submit-proof`);
    console.log(`   GET  http://localhost:${PORT}/api/blockchain/gig/:gigId/proof`);
    console.log(`   POST http://localhost:${PORT}/api/blockchain/gig/:gigId/approve`);
    console.log(`   GET  http://localhost:${PORT}/api/blockchain/gig/:gigId/status`);

    console.log(`\n Job Management endpoints:`);
    console.log(`   PATCH http://localhost:${PORT}/api/jobs/:jobId/accept`);
    console.log(`   GET   http://localhost:${PORT}/api/jobs/available`);
    console.log(`   GET   http://localhost:${PORT}/api/jobs/freelancer/:userId`);
    console.log(`   GET   http://localhost:${PORT}/api/jobs/customer/:userId`);
    console.log(`   PATCH http://localhost:${PORT}/api/jobs/:jobId/status`);
    console.log(`   GET   http://localhost:${PORT}/api/jobs/:jobId/details`);

    console.log(`\n Press Ctrl+C to stop the server\n`);
});