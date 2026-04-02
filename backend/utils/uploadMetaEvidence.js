/**
 * uploadMetaEvidence.js — SwaRojgar ERC-1497 MetaEvidence IPFS Uploader
 *
 * Called at gig creation time to pin a MetaEvidence JSON to IPFS via Pinata.
 * The returned IPFS URI is passed to createGig() on the smart contract.
 *
 * MetaEvidence JSON format follows the ERC-1497 standard:
 * https://developer.kleros.io/en/latest/erc-1497.html
 */

const axios = require("axios");

const PINATA_JWT = process.env.PINATA_JWT;
const PINATA_GATEWAY = "https://gateway.pinata.cloud/ipfs";

/**
 * Uploads a MetaEvidence document to IPFS via Pinata.
 *
 * @param {Object} gigData - Gig information to embed.
 * @param {string} gigData.gigId      - Unique gig identifier.
 * @param {string} gigData.title      - Gig title.
 * @param {string} gigData.description - Full gig brief/description.
 * @param {string} gigData.category   - Job category (e.g., "Software Development").
 * @param {string} gigData.budget     - Budget in SRT tokens.
 * @param {string} gigData.deadline   - Deadline (ISO date string or human-readable).
 * @param {string} gigData.clientName - Client's display name (optional).
 *
 * @returns {Promise<string>} IPFS URI (e.g., "/ipfs/QmXxx...")
 */
async function uploadMetaEvidence(gigData) {
    const metaEvidence = {
        // ── ERC-1497 Required Fields ────────────────────────────────────────
        title: gigData.title || "SwaRojgar Freelance Gig Dispute",
        description: gigData.description || "No description provided.",
        category: gigData.category || "Freelance Services",

        // Question posed to Kleros jurors when/if escalated
        question: "Does the freelancer's submitted work adequately fulfill the requirements of this gig as described in the brief?",

        // Ruling options presented to Kleros jurors
        rulingOptions: {
            type: "single-select",
            titles: ["Refuse to Arbitrate", "Pay Freelancer", "Refund Client"],
            descriptions: [
                "The juror refuses to arbitrate. The case will be escalated to human arbitration.",
                "The freelancer's work sufficiently meets the requirements. Release the escrowed SRT tokens to the freelancer.",
                "The freelancer's work does not meet the requirements. Refund the escrowed SRT tokens to the client."
            ]
        },

        // ── SwaRojgar Custom Fields ─────────────────────────────────────────
        gigId: gigData.gigId,
        budget: gigData.budget,
        deadline: gigData.deadline || "Not specified",
        client: gigData.clientName || "Anonymous",
        createdAt: new Date().toISOString(),

        // Instructions for jurors reviewing this case
        primaryDocument: "",  // Populated if client uploads a detailed brief PDF
        subCategory: gigData.category || "Software & Technology",

        aliases: {
            juror: "Kleros Juror",
            requester: gigData.clientName || "Client",
            respondent: "Freelancer"
        },

        // Policy document for jurors: what to check when evaluating
        disputePolicy: `
## SwaRojgar Dispute Policy v1.0

**As a Kleros juror for this case, evaluate the following:**

1. **Completeness:** Does the submitted work cover all requirements in the gig description?
2. **Quality:** Is the work of professional quality appropriate for the budget?
3. **Timeliness:** Was the work submitted within the agreed-upon deadline?
4. **Communication:** Did the freelancer communicate clearly and respond to feedback?

**Ruling Guidelines:**
- Rule 1 (Pay Freelancer) if: Work is substantially complete and meets the core requirements.
- Rule 2 (Refund Client) if: Work is substantially incomplete, wrong, or of unacceptably poor quality.
- Rule 0 (Refuse) only if: You cannot determine a fair outcome from the evidence given.

*Evidence is linked in the dispute thread. Review all IPFS evidence submissions before voting.*
        `.trim()
    };

    try {
        const response = await axios.post(
            "https://api.pinata.cloud/pinning/pinJSONToIPFS",
            {
                pinataContent: metaEvidence,
                pinataMetadata: {
                    name: `meta-evidence-${gigData.gigId}`,
                    keyvalues: { gigId: gigData.gigId, type: "meta-evidence" }
                },
                pinataOptions: { cidVersion: 1 }
            },
            {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${PINATA_JWT}`
                }
            }
        );

        const cid = response.data.IpfsHash;
        const uri = `/ipfs/${cid}`;
        console.log(`📌 MetaEvidence pinned: ${PINATA_GATEWAY}/${cid}`);
        return uri;

    } catch (error) {
        console.error("❌ Failed to upload MetaEvidence to Pinata:", error.response?.data || error.message);
        throw new Error(`IPFS upload failed: ${error.message}`);
    }
}

/**
 * Uploads an Evidence document (for a party during a Kleros dispute).
 * Returns the IPFS URI to be emitted via Evidence event on-chain.
 *
 * @param {Object} evidenceData
 * @param {string} evidenceData.name         - Short name of the evidence.
 * @param {string} evidenceData.description  - Explanation of what this evidence shows.
 * @param {string} [evidenceData.fileUri]    - IPFS URI of any attached file.
 * @param {string} evidenceData.gigId
 * @param {string} evidenceData.submittedBy  - 'client' or 'freelancer'
 */
async function uploadEvidence(evidenceData) {
    const evidence = {
        name: evidenceData.name || "Evidence Submission",
        description: evidenceData.description,
        fileUri: evidenceData.fileUri || "",
        fileTypeExtension: evidenceData.fileTypeExtension || "",
        gigId: evidenceData.gigId,
        submittedBy: evidenceData.submittedBy,
        submittedAt: new Date().toISOString()
    };

    try {
        const response = await axios.post(
            "https://api.pinata.cloud/pinning/pinJSONToIPFS",
            {
                pinataContent: evidence,
                pinataMetadata: {
                    name: `evidence-${evidenceData.gigId}-${Date.now()}`,
                    keyvalues: {
                        gigId: evidenceData.gigId,
                        type: "evidence",
                        party: evidenceData.submittedBy
                    }
                },
                pinataOptions: { cidVersion: 1 }
            },
            {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${PINATA_JWT}`
                }
            }
        );

        const cid = response.data.IpfsHash;
        const uri = `/ipfs/${cid}`;
        console.log(`📌 Evidence pinned: ${PINATA_GATEWAY}/${cid}`);
        return uri;

    } catch (error) {
        console.error("❌ Failed to upload Evidence to Pinata:", error.response?.data || error.message);
        throw new Error(`Evidence IPFS upload failed: ${error.message}`);
    }
}

module.exports = { uploadMetaEvidence, uploadEvidence };
