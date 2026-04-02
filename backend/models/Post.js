const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    content: { type: String, required: true },
    userType: { type: String, enum: ['client', 'freelancer'], required: true },
    postType: { type: String, enum: ['job', 'experience'], required: true },
    createdAt: { type: Date, default: Date.now },
    image: { type: String },

    // ── Gig Number (human-readable sequential ID) ─────────────────────────
    // Auto-assigned on creation: Gig #1, #2, #3...
    // Only applies to postType === 'job'
    gigNumber: { type: Number, unique: true, sparse: true }, // sparse: only unique if present

    // Job-specific fields
    srtAmount: { type: Number },
    status: {
        type: String,
        enum: ['OPEN', 'ASSIGNED', 'PROOF_SUBMITTED', 'COMPLETED', 'DISPUTED', 'DISPUTED_AI', 'DISPUTED_KLEROS', 'DISPUTED_HUMAN', 'CANCELLED', 'REFUNDED'],
        default: 'OPEN'
    },
    assignedFreelancer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    freelancerWallet: { type: String },
    clientWallet:     { type: String },  // Client's wallet address (for escrow linkage)

    // Proof of work fields
    proofIpfsHash: { type: String },
    proofDescription: { type: String },
    submittedAt: { type: Date },
    completedAt: { type: Date },

    // Blockchain transaction hashes
    blockchainTxHash: { type: String },

    // Dispute fields (synced from blockchain events)
    disputeTier: { type: Number, default: null },  // 1, 2, or 3
    aiProposal: { type: Object, default: null },    // Cached AI verdict JSON
    klerosDisputeId: { type: Number, default: null },

    // Deadline
    deadline: { type: Number } // Unix timestamp
});

// ─── Auto-assign gigNumber on new job posts ───────────────────────────────────
postSchema.pre('save', async function (next) {
    // Only assign gigNumber to new job posts that don't have one yet
    if (this.isNew && this.postType === 'job' && !this.gigNumber) {
        try {
            // Count existing jobs to derive the next number
            const count = await mongoose.model('Post').countDocuments({ postType: 'job' });
            this.gigNumber = count + 1;
        } catch (err) {
            return next(err);
        }
    }
    next();
});

// ─── Virtual: formatted gig label ────────────────────────────────────────────
postSchema.virtual('gigLabel').get(function () {
    return this.gigNumber ? `Gig #${this.gigNumber}` : null;
});

// The second argument specifies the collection name
const Post = mongoose.model('Post', postSchema, 'posts');

module.exports = Post;