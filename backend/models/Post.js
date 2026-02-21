const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    content: { type: String, required: true },
    userType: { type: String, enum: ['client', 'freelancer'], required: true },
    postType: { type: String, enum: ['job', 'experience'], required: true },
    createdAt: { type: Date, default: Date.now },
    image: { type: String }, // Optional image field

    // Job-specific fields
    srtAmount: { type: Number }, // Payment amount in SRT tokens
    status: {
        type: String,
        enum: ['OPEN', 'ASSIGNED', 'PROOF_SUBMITTED', 'COMPLETED', 'DISPUTED', 'CANCELLED'],
        default: 'OPEN'
    },
    assignedFreelancer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    freelancerWallet: { type: String }, // Freelancer's wallet address

    // Proof of work fields
    proofIpfsHash: { type: String }, // IPFS hash of submitted proof
    proofDescription: { type: String }, // Description of the proof
    submittedAt: { type: Date }, // When proof was submitted
    completedAt: { type: Date }, // When job was completed

    // Blockchain transaction hashes
    blockchainTxHash: { type: String }, // Transaction hash for job creation/acceptance

    // Deadline
    deadline: { type: Number } // Unix timestamp
});

// The second argument specifies the collection name
const Post = mongoose.model('Post', postSchema, 'posts');

module.exports = Post;