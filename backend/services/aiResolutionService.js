/**
 * aiResolutionService.js — SwaRojgar AI Dispute Resolution (Tier 1)
 *
 * This service:
 *   1. Fetches gig data (brief, chat logs, proof) from MongoDB + IPFS
 *   2. Feeds everything to Claude/OpenAI as a structured prompt
 *   3. Generates a "Proposed Resolution" JSON with confidence score + reasoning
 *   4. Uploads the verdict to IPFS via Pinata
 *   5. Calls setAIProposal() on the smart contract to record the verdict URI
 *
 * Required env vars:
 *   GROK_API_KEY          (xAI Grok — get from console.x.ai)
 *   BLOCKCHAIN_RPC_URL
 *   BLOCKCHAIN_PRIVATE_KEY
 *   ESCROW_CONTRACT_ADDRESS
 */

// Lazy-load ethers (large package — defers ~2min init cost to first use)
let _ethers;
function getEthers() {
    if (!_ethers) _ethers = require('ethers').ethers;
    return _ethers;
}
const axios = require("axios");
const FormData = require("form-data");
const mongoose = require("mongoose");
const Post = require("../models/Post");

// ─── Contract ABI (only the functions we need) ────────────────────────────────
const ESCROW_ABI = [
    "function getGig(string gigId) view returns (tuple(string gigId, address client, address freelancer, uint256 amount, uint8 status, uint256 createdAt, uint256 deadline, string proofIpfsHash, string metaEvidenceUri, string aiProposalUri, bool clientAcceptsAI, bool freelancerAcceptsAI, uint256 metaEvidenceID, uint256 klerosDisputeId, bool hasKlerosDispute, uint256 klerosRuling))",
    "function setAIProposal(string gigId, string proposalUri) external"
];

// ─── Config ───────────────────────────────────────────────────────────────────
const CONFIG = {
    rpcUrl: process.env.BLOCKCHAIN_RPC_URL,
    privateKey: process.env.BLOCKCHAIN_PRIVATE_KEY,
    escrowAddress: process.env.ESCROW_CONTRACT_ADDRESS,
    pinataJwt: process.env.PINATA_JWT,
    grokKey: process.env.GROK_API_KEY,
    grokModel: "grok-3"
};

// ─── Pinata IPFS Upload ───────────────────────────────────────────────────────
async function uploadJsonToPinata(jsonObject, name) {
    const data = JSON.stringify({
        pinataContent: jsonObject,
        pinataMetadata: { name },
        pinataOptions: { cidVersion: 1 }
    });

    const response = await axios.post(
        "https://api.pinata.cloud/pinning/pinJSONToIPFS",
        data,
        {
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${CONFIG.pinataJwt}`
            }
        }
    );

    const cid = response.data.IpfsHash;
    console.log(`📌 Pinned to IPFS: ${cid}`);
    return `/ipfs/${cid}`;
}

// ─── Fetch MetaEvidence from IPFS ─────────────────────────────────────────────
async function fetchFromIPFS(ipfsUri) {
    try {
        const cid = ipfsUri.replace("/ipfs/", "").replace("ipfs://", "");
        const res = await axios.get(`https://gateway.pinata.cloud/ipfs/${cid}`, { timeout: 10000 });
        return res.data;
    } catch (e) {
        console.warn(`⚠️  Could not fetch IPFS data for ${ipfsUri}:`, e.message);
        return null;
    }
}

// ─── LLM Analysis ─────────────────────────────────────────────────────────────
async function analyzeWithLLM(gigContext) {
    const systemPrompt = `You are an impartial AI arbitrator for a decentralized freelance marketplace called SwaRojgar.
Your job is to fairly analyze disputes between clients and freelancers based strictly on the evidence provided.
Always return a structured JSON response. Be objective, concise, and cite specific evidence in your reasoning.`;

    const userPrompt = `Analyze this freelance dispute and provide a fair resolution:

## GIG DETAILS
- Title: ${gigContext.title}
- Description: ${gigContext.description}
- Budget: ${gigContext.amount} SRT tokens
- Deadline: ${gigContext.deadline || "Not specified"}

## SUBMITTED PROOF
${gigContext.proofDescription || "No description provided"}
IPFS Hash: ${gigContext.proofIpfsHash}

## META EVIDENCE CONTEXT
${JSON.stringify(gigContext.metaEvidence, null, 2)}

## YOUR TASK
Determine who should receive the escrowed funds based on:
1. Whether the work matches the original brief
2. Quality and completeness of the proof submitted
3. Any breach of the agreed terms

Respond with ONLY a valid JSON object in this exact format:
{
  "ruling": 1,
  "rulingLabel": "Pay Freelancer",
  "confidence": 0.87,
  "summary": "One paragraph executive summary in plain English",
  "reasoning": {
    "forFreelancer": ["Point 1", "Point 2"],
    "forClient": ["Point 1", "Point 2"]
  },
  "keyFindings": ["Finding 1", "Finding 2"],
  "recommendation": "Detailed recommendation (2-3 sentences)"
}

Ruling options: 1 = Pay Freelancer (work accepted), 2 = Refund Client (work rejected)`;

    const response = await axios.post(
        "https://api.x.ai/v1/chat/completions",
        {
            model: CONFIG.grokModel,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            response_format: { type: "json_object" },
            temperature: 0.2, // Low temp for consistent, deterministic rulings
            max_tokens: 1500
        },
        {
            headers: {
                Authorization: `Bearer ${CONFIG.grokKey}`,
                "Content-Type": "application/json"
            }
        }
    );

    const content = response.data.choices[0].message.content;
    return JSON.parse(content);
}

// ─── Main Service Function ─────────────────────────────────────────────────────
/**
 * Processes a dispute for a given gig ID.
 * Called by the backend event listener when DisputeRaisedAI is emitted.
 *
 * @param {string} gigId - The gig ID (MongoDB/blockchain ID)
 */
async function processAIDispute(gigId) {
    console.log(`\n🤖 AI Resolution Pipeline Started for gig: ${gigId}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    // 1. Connect to blockchain
    const ethers = getEthers();
    const provider = new ethers.JsonRpcProvider(CONFIG.rpcUrl);
    const signer = new ethers.Wallet(CONFIG.privateKey, provider);
    const escrow = new ethers.Contract(CONFIG.escrowAddress, ESCROW_ABI, signer);

    // 2. Fetch on-chain gig data
    console.log("🔗 Fetching on-chain gig data...");
    const gigData = await escrow.getGig(gigId);

    // 3. Fetch MetaEvidence from IPFS
    console.log("📦 Fetching MetaEvidence from IPFS...");
    const metaEvidence = gigData.metaEvidenceUri
        ? await fetchFromIPFS(gigData.metaEvidenceUri)
        : null;

    // 4. Fetch MongoDB gig details for richer context
    console.log("🗄️  Fetching MongoDB gig details...");
    const dbPost = await Post.findOne({ gigId }).lean().catch(() => null);

    // 5. Build context object for LLM
    const gigContext = {
        title: dbPost?.title || metaEvidence?.title || `Gig #${gigId}`,
        description: dbPost?.description || metaEvidence?.description || "No description available",
        amount: ethers.formatEther(gigData.amount) + " SRT",
        deadline: gigData.deadline > 0
            ? new Date(Number(gigData.deadline) * 1000).toISOString()
            : null,
        proofIpfsHash: gigData.proofIpfsHash || "Not submitted",
        proofDescription: dbPost?.proofDescription || "No proof description",
        clientAddress: gigData.client,
        freelancerAddress: gigData.freelancer,
        metaEvidence: metaEvidence || {}
    };

    // 6. Get AI ruling
    console.log("🧠 Sending to LLM for analysis...");
    const aiVerdict = await analyzeWithLLM(gigContext);
    console.log(`   Ruling: ${aiVerdict.rulingLabel} (confidence: ${(aiVerdict.confidence * 100).toFixed(0)}%)`);

    // 7. Build the full proposal document
    const proposalDocument = {
        version: "1.0",
        gigId,
        generatedAt: new Date().toISOString(),
        resolvedBy: "SwaRojgar AI Arbitrator (Grok-3)",
        ...aiVerdict,
        // ERC-1497 compatible fields
        title: "AI Proposed Resolution",
        description: aiVerdict.summary,
        question: "Should the escrowed funds be paid to the freelancer or refunded to the client?",
        rulingOptions: {
            type: "single-select",
            titles: ["Refuse to Arbitrate", "Pay Freelancer", "Refund Client"]
        }
    };

    // 8. Upload verdict to IPFS
    console.log("📌 Uploading AI verdict to IPFS...");
    const proposalUri = await uploadJsonToPinata(proposalDocument, `ai-verdict-${gigId}`);

    // 9. Submit proposal URI to smart contract
    console.log("⛓️  Submitting AI proposal URI to contract...");
    const tx = await escrow.setAIProposal(gigId, proposalUri);
    const receipt = await tx.wait();
    console.log(`   ✅ TX confirmed: ${receipt.hash}`);

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`✅ AI Resolution Complete for gig: ${gigId}\n`);

    return {
        gigId,
        proposalUri,
        verdict: aiVerdict,
        txHash: receipt.hash
    };
}

// ─── Blockchain Event Listener ─────────────────────────────────────────────────
/**
 * Starts listening for DisputeRaisedAI events on the GigEscrow contract.
 * Run this as a long-lived process alongside the main backend server.
 */
async function startEventListener() {
    const ethers = getEthers();
    const provider = new ethers.JsonRpcProvider(CONFIG.rpcUrl);
    const escrow = new ethers.Contract(CONFIG.escrowAddress, [
        ...ESCROW_ABI,
        "event DisputeRaisedAI(string indexed gigId, address indexed raisedBy)"
    ], provider);

    console.log("👂 AI Resolution Service listening for DisputeRaisedAI events...");

    escrow.on("DisputeRaisedAI", async (gigId, raisedBy) => {
        console.log(`\n⚡ DisputeRaisedAI event received!`);
        console.log(`   GigID: ${gigId} | Raised by: ${raisedBy}`);
        try {
            await processAIDispute(gigId);
        } catch (error) {
            console.error(`❌ AI Resolution failed for ${gigId}:`, error.message);
        }
    });
}

module.exports = { processAIDispute, startEventListener };
