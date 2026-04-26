/**
 * dispute.js — SwaRojgar Dispute API Routes
 *
 * Endpoints:
 *   POST /api/dispute/upload-evidence     — Upload evidence file/text to IPFS
 *   POST /api/dispute/upload-meta         — Upload MetaEvidence for a new gig
 *   GET  /api/dispute/:gigId              — Get full dispute state for a gig
 *   POST /api/dispute/:gigId/ai-trigger   — Manually trigger AI analysis (admin)
 */

const express = require("express");
const multer = require("multer");
const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const path = require("path");
const { uploadMetaEvidence, uploadEvidence } = require("../utils/uploadMetaEvidence");
const { processAIDispute } = require("../services/aiResolutionService");

const { authMiddleware } = require("../middleware/auth");
const router = express.Router();

// ─── Multer: store files in memory for Pinata upload ─────────────────────────
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB max
    fileFilter: (req, file, cb) => {
        const allowed = [
            "image/png", "image/jpeg", "image/gif", "image/webp",
            "application/pdf", "text/plain", "video/mp4",
            "application/zip", "application/x-zip-compressed"
        ];
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error("Unsupported file type"));
        }
    }
});

const PINATA_JWT = process.env.PINATA_JWT;

// ─── Helper: Upload binary file to Pinata ────────────────────────────────────
async function uploadFileToPinata(fileBuffer, filename, mimetype, gigId) {
    const formData = new FormData();
    formData.append("file", fileBuffer, {
        filename,
        contentType: mimetype
    });
    formData.append("pinataMetadata", JSON.stringify({
        name: `evidence-file-${gigId}-${filename}`,
        keyvalues: { gigId, type: "evidence-file" }
    }));
    formData.append("pinataOptions", JSON.stringify({ cidVersion: 1 }));

    const response = await axios.post(
        "https://api.pinata.cloud/pinning/pinFileToIPFS",
        formData,
        {
            headers: {
                ...formData.getHeaders(),
                Authorization: `Bearer ${PINATA_JWT}`
            },
            maxBodyLength: Infinity
        }
    );

    return `/ipfs/${response.data.IpfsHash}`;
}

// ─── POST /api/dispute/upload-meta ────────────────────────────────────────────
// Called when a new gig is created. Returns MetaEvidence IPFS URI.
router.post("/upload-meta", async (req, res) => {
    try {
        const { gigId, title, description, category, budget, deadline, clientName } = req.body;

        if (!gigId || !title || !description) {
            return res.status(400).json({ error: "gigId, title, and description are required" });
        }

        const ipfsUri = await uploadMetaEvidence({
            gigId, title, description, category, budget, deadline, clientName
        });

        res.json({ success: true, metaEvidenceUri: ipfsUri });

    } catch (error) {
        console.error("MetaEvidence upload error:", error);
        res.status(500).json({ error: error.message });
    }
});

// ─── POST /api/dispute/upload-evidence ───────────────────────────────────────
// Called by either party during Tier 2 (Kleros) to submit evidence.
// Optionally accepts a file attachment alongside text description.
router.post("/upload-evidence", upload.single("file"), async (req, res) => {
    try {
        const { gigId, name, description, submittedBy, party } = req.body;

        if (!gigId || !description) {
            return res.status(400).json({ error: "gigId and description are required" });
        }

        let fileUri = "";
        let fileTypeExtension = "";

        // If a file was attached, upload it to Pinata first
        if (req.file) {
            console.log(`📂 Uploading evidence file to Pinata: ${req.file.originalname}`);
            fileUri = await uploadFileToPinata(
                req.file.buffer,
                req.file.originalname,
                req.file.mimetype,
                gigId
            );
            fileTypeExtension = path.extname(req.file.originalname).slice(1);
        }

        // Upload the evidence JSON metadata to IPFS
        const evidenceUri = await uploadEvidence({
            gigId,
            name: name || "Evidence Submission",
            description,
            fileUri,
            fileTypeExtension,
            submittedBy: submittedBy || party || "unknown"
        });

        res.json({
            success: true,
            evidenceUri,
            fileUri: fileUri || null
        });

    } catch (error) {
        console.error("Evidence upload error:", error);
        res.status(500).json({ error: error.message });
    }
});

// ─── GET /api/dispute/:gigId ─────────────────────────────────────────────────
// Returns cached dispute state for the given gig from MongoDB.
router.get("/:gigId", async (req, res) => {
    try {
        const { gigId } = req.params;
        const Post = require("../models/Post");

        const post = await Post.findOne({ gigId })
            .populate("userId", "firstName lastName profilePhoto")
            .populate("assignedFreelancer", "firstName lastName profilePhoto");

        if (!post) {
            return res.status(404).json({ error: "Gig not found" });
        }

        res.json({
            gigId,
            title: post.title,
            status: post.status,
            disputeTier: post.disputeTier || null,
            aiProposal: post.aiProposal || null,
            klerosDisputeId: post.klerosDisputeId || null,
            client: post.userId,
            freelancer: post.assignedFreelancer,
            amount: post.amount,
            proofIpfsHash: post.proofIpfsHash
        });

    } catch (error) {
        console.error("Get dispute error:", error);
        res.status(500).json({ error: error.message });
    }
});

// ─── POST /api/dispute/:gigId/ai-trigger ─────────────────────────────────────
// Trigger AI analysis for a disputed gig. Requires valid JWT (any logged-in user).
router.post("/:gigId/ai-trigger", authMiddleware, async (req, res) => {
    try {
        const { gigId } = req.params;
        console.log(`🤖 AI resolution triggered for gig: ${gigId} by user: ${req.user.userId}`);

        // Await full result so Vercel doesn't kill the function early
        const result = await processAIDispute(gigId);

        console.log(`✅ AI resolved gig ${gigId}:`, result.verdict.rulingLabel);
        res.json({
            success: true,
            ruling: result.verdict.rulingLabel,
            confidence: result.verdict.confidence,
            proposalUri: result.proposalUri,
            txHash: result.txHash,
        });

    } catch (error) {
        console.error("AI trigger error:", error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
