const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    firstName:    { type: String, default: '' },
    lastName:     { type: String, default: '' },
    email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
    phoneNumber:  { type: String, default: '' },
    password:     { type: String, required: true },
    userType: {
        type: String,
        required: true,
        enum: ['client', 'freelancer'],
        default: 'client'
    },
    profilePhoto: { type: String, default: null },

    // ── Wallet ────────────────────────────────────────────────────────────────
    walletAddress: { type: String, default: null, lowercase: true },

    // ── Freelancer Profile Fields ─────────────────────────────────────────────
    bio:           { type: String, default: '' },
    skills:        [{ type: String }],
    hourlyRate:    { type: Number, default: 0 },  // in SRT tokens
    portfolio:     { type: String, default: '' },  // external link or IPFS

    // ── Stats ─────────────────────────────────────────────────────────────────
    totalGigsCompleted: { type: Number, default: 0 },
    totalEarnedSRT:     { type: Number, default: 0 },
    averageRating:      { type: Number, default: 0, min: 0, max: 5 },

    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
module.exports = User;