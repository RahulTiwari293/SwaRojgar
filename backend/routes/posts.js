const express = require('express');
const multer = require('multer');
const path = require('path');
const Post = require('../models/Post');

const router = express.Router();

// Set up storage for uploaded images
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/posts/'); // Directory where files will be stored
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname); // Filename format
    }
});

const upload = multer({ storage: storage });

// Create post route with image upload
router.post('/', upload.single('image'), async (req, res) => {
    const { userId, title, content, userType, postType } = req.body;
    const imagePath = req.file ? `uploads/posts/${req.file.filename}` : null; // Get the image path

    // Validate postType based on userType
    if (userType === 'client' && postType !== 'job') {
        return res.status(400).json({ message: 'Clients can only create job posts' });
    }
    if (userType === 'freelancer' && postType !== 'experience') {
        return res.status(400).json({ message: 'Freelancers can only create experience posts' });
    }

    const newPost = new Post({
        userId,
        title,
        content,
        userType,
        postType,
        image: imagePath // Ensure this is a relative path
    });

    try {
        await newPost.save();
        res.status(201).json({ message: 'Post created successfully', post: newPost });
    } catch (error) {
        console.error("Error creating post:", error);
        res.status(500).json({ message: 'Error creating post', error: error.message });
    }
});
// Get all posts (with optional filtering by postType)
router.get('/', async (req, res) => {
    try {
        const { postType } = req.query;
        const filter = postType ? { postType } : {};

        const posts = await Post.find(filter)
            .populate('userId', 'firstName lastName profilePhoto')
            .sort({ createdAt: -1 }); // Sort by newest first

        res.status(200).json(posts); // Return the posts as JSON
    } catch (error) {
        console.error("Error fetching posts:", error);
        res.status(500).json({ message: 'Error fetching posts', error: error.message });
    }
});


module.exports = router;