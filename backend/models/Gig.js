const mongoose = require('mongoose');

const gigSchema = new mongoose.Schema({
    gigId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    customerWallet: {
        type: String,
        required: true
    },
    freelancerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    freelancerWallet: {
        type: String,
        default: null
    },
    amount: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['OPEN', 'ASSIGNED', 'PROOF_SUBMITTED', 'COMPLETED', 'DISPUTED', 'CANCELLED'],
        default: 'OPEN'
    },
    blockchainTxHash: {
        type: String,
        default: null
    },
    ipfsProofHash: {
        type: String,
        default: null
    },
    proofMetadata: {
        fileCount: Number,
        uploadedAt: Date,
        description: String
    },
    deadline: {
        type: Date,
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update timestamp on save
gigSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

const Gig = mongoose.model('Gig', gigSchema);

module.exports = Gig;
