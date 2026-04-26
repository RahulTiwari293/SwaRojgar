import React, { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { useGig, pushToast } from "./context/GigContext";
import { SkeletonDisputePanel } from "./components/Skeleton";
import Navbar from "./navbar";

const ESCROW_ADDRESS = (import.meta.env.VITE_ESCROW_CONTRACT_ADDRESS || "0x8eFa974E68A449B25Db77B73841dc14921A98Ba5").trim();
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5010";

const ESCROW_ABI = [
    "function raiseDisputeAI(string gigId) external",
    "function voteOnAIProposal(string gigId, bool accept) external",
    "function escalateToKleros(string gigId) external payable",
    "function submitEvidenceToKleros(string gigId, string evidenceUri) external",
    "function getArbitrationCost() view returns (uint256)",
    "function getGig(string gigId) view returns (tuple(string gigId, uint256 gigNumber, address client, address freelancer, uint256 amount, uint8 status, uint256 createdAt, uint256 deadline, string proofIpfsHash, string metaEvidenceUri, string aiProposalUri, bool clientAcceptsAI, bool freelancerAcceptsAI, uint256 metaEvidenceID, uint256 klerosDisputeId, bool hasKlerosDispute, uint256 klerosRuling))",
];

const GigStatus = {
    0: "OPEN", 1: "ASSIGNED", 2: "PROOF_SUBMITTED",
    3: "DISPUTED_AI", 4: "DISPUTED_KLEROS",
    5: "DISPUTED_HUMAN", 6: "COMPLETED", 7: "REFUNDED"
};

const STEPS = [
    { id: "proof",    label: "Proof Submitted",      icon: "📄" },
    { id: "ai",       label: "AI Review (Tier 1)",    icon: "🤖" },
    { id: "kleros",   label: "Kleros Court (Tier 2)", icon: "⚖️" },
    { id: "human",    label: "Human Admin (Tier 3)",  icon: "👤" },
    { id: "resolved", label: "Resolved",              icon: "✅" },
];

function getStepIndex(status) {
    const map = {
        "PROOF_SUBMITTED": 0, "DISPUTED_AI": 1,
        "DISPUTED_KLEROS": 2, "DISPUTED_HUMAN": 3,
        "COMPLETED": 4, "REFUNDED": 4
    };
    return map[status] ?? -1;
}

function StatusBadge({ status }) {
    const styles = {
        OPEN:             "bg-white/10 text-white/70 border-white/20",
        ASSIGNED:         "bg-white/10 text-white/70 border-white/20",
        PROOF_SUBMITTED:  "bg-white/15 text-white border-white/30",
        DISPUTED_AI:      "bg-white/10 text-white/70 border-white/20",
        DISPUTED_KLEROS:  "bg-white/10 text-white/70 border-white/20",
        DISPUTED_HUMAN:   "bg-white/10 text-white/70 border-white/20",
        COMPLETED:        "bg-white/20 text-white border-white/40 font-bold",
        REFUNDED:         "bg-white/8 text-white/50 border-white/15",
    };
    return (
        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${styles[status] || "bg-white/8 text-white/50 border-white/10"}`}>
            {status?.replace(/_/g, " ")}
        </span>
    );
}

function Stepper({ status }) {
    const activeIdx = getStepIndex(status);
    return (
        <div className="relative flex items-start justify-between mt-2 mb-8">
            <div className="absolute left-0 right-0 top-5 h-0.5 bg-white/10 z-0" />
            <div
                className="absolute left-0 top-5 h-0.5 bg-white z-0 transition-all duration-700"
                style={{ width: activeIdx < 0 ? "0%" : `${(activeIdx / (STEPS.length - 1)) * 100}%` }}
            />
            {STEPS.map((step, idx) => {
                const isDone    = idx < activeIdx;
                const isActive  = idx === activeIdx;
                const isPending = idx > activeIdx;
                return (
                    <div key={step.id} className="relative z-10 flex flex-col items-center gap-2 flex-1">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg border-2 transition-all duration-500
                            ${isDone    ? "bg-white border-white text-black" : ""}
                            ${isActive  ? "bg-white/20 border-white/60 animate-pulse" : ""}
                            ${isPending ? "bg-white/5 border-white/10" : ""}
                        `}>
                            {isDone ? "✓" : step.icon}
                        </div>
                        <span className={`text-center text-xs font-medium leading-tight max-w-[80px]
                            ${isDone   ? "text-white" : ""}
                            ${isActive ? "text-white" : ""}
                            ${isPending? "text-white/30" : ""}
                        `}>{step.label}</span>
                    </div>
                );
            })}
        </div>
    );
}

function AIVerdictCard({ proposal, gigId, status, onVote, isClient, isFreelancer, clientAccepts, freelancerAccepts }) {
    const [loading, setLoading] = useState(false);

    const handleVote = async (accept) => {
        setLoading(true);
        await onVote(accept);
        setLoading(false);
    };

    if (!proposal) {
        return (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 flex flex-col items-center gap-3">
                <div className="text-4xl">🤖</div>
                <p className="text-white/60 text-sm text-center">
                    AI is analyzing the project brief, proof of work, and chat history...
                    <br/><span className="text-white/80">This usually takes 30–90 seconds.</span>
                </p>
                <div className="flex gap-1 mt-2">
                    {[0,1,2].map(i => (
                        <div key={i} className="w-2 h-2 rounded-full bg-white/40 animate-bounce"
                             style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                </div>
            </div>
        );
    }

    const rulingLabel = proposal.ruling === 1 ? "Pay Freelancer" : "Refund Client";
    const rulingColor = proposal.ruling === 1 ? "text-white" : "text-white/60";
    const confidence  = Math.round((proposal.confidence || 0.5) * 100);

    return (
        <div className="rounded-2xl border border-white/20 bg-white/5 p-6 space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                    <span className="text-3xl">🤖</span>
                    <div>
                        <p className="text-white font-semibold">AI Arbitrator Verdict</p>
                        <p className="text-white/40 text-xs">Powered by GPT-4 · {proposal.generatedAt?.slice(0,10)}</p>
                    </div>
                </div>
                <div className={`text-lg font-bold ${rulingColor}`}>{rulingLabel}</div>
            </div>

            <div>
                <div className="flex justify-between text-xs text-white/50 mb-1">
                    <span>Confidence</span><span>{confidence}%</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                        className="h-full rounded-full bg-white transition-all duration-700"
                        style={{ width: `${confidence}%` }}
                    />
                </div>
            </div>

            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <p className="text-white/80 text-sm leading-relaxed">{proposal.summary}</p>
            </div>

            {proposal.keyFindings?.length > 0 && (
                <div>
                    <p className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-2">Key Findings</p>
                    <ul className="space-y-1">
                        {proposal.keyFindings.map((f, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-white/70">
                                <span className="text-white/40 mt-0.5 shrink-0">›</span>{f}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                    <p className="text-white/60 text-xs font-semibold mb-2">✓ For Freelancer</p>
                    {proposal.reasoning?.forFreelancer?.map((p, i) => (
                        <p key={i} className="text-white/60 text-xs leading-relaxed mb-1">• {p}</p>
                    ))}
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                    <p className="text-white/40 text-xs font-semibold mb-2">✗ For Client</p>
                    {proposal.reasoning?.forClient?.map((p, i) => (
                        <p key={i} className="text-white/60 text-xs leading-relaxed mb-1">• {p}</p>
                    ))}
                </div>
            </div>

            {status === "DISPUTED_AI" && (
                <div className="border-t border-white/10 pt-4">
                    <p className="text-white/50 text-xs mb-3 text-center">Both parties must accept to resolve without escalation</p>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                        <div className={`text-center text-xs p-2 rounded-lg border ${clientAccepts ? "border-white/30 bg-white/10 text-white" : "border-white/10 text-white/30"}`}>
                            Client: {clientAccepts ? "✓ Accepted" : "Pending..."}
                        </div>
                        <div className={`text-center text-xs p-2 rounded-lg border ${freelancerAccepts ? "border-white/30 bg-white/10 text-white" : "border-white/10 text-white/30"}`}>
                            Freelancer: {freelancerAccepts ? "✓ Accepted" : "Pending..."}
                        </div>
                    </div>
                    {(isClient || isFreelancer) && (
                        <div className="flex gap-3">
                            <button
                                onClick={() => handleVote(true)}
                                disabled={loading}
                                className="flex-1 py-3 rounded-xl bg-white hover:bg-gray-100 text-black font-semibold text-sm transition-all disabled:opacity-50"
                            >
                                {loading ? "Processing..." : "✓ Accept Verdict"}
                            </button>
                            <button
                                onClick={() => handleVote(false)}
                                disabled={loading}
                                className="flex-1 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-sm transition-all border border-white/10 disabled:opacity-50"
                            >
                                ✗ Reject → Escalate
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function KlerosCard({ gig, onEscalate, onSubmitEvidence, isParty, arbitrationCost }) {
    const [evidenceText, setEvidenceText] = useState("");
    const [evidenceName, setEvidenceName] = useState("");
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);

    const handleEscalate = async () => {
        setLoading(true);
        await onEscalate();
        setLoading(false);
    };

    const handleSubmitEvidence = async () => {
        if (!evidenceText.trim()) return;
        setUploading(true);
        await onSubmitEvidence({ name: evidenceName, description: evidenceText, file });
        setEvidenceText(""); setEvidenceName(""); setFile(null);
        setUploading(false);
    };

    return (
        <div className="space-y-4">
            <div className="rounded-2xl border border-white/15 bg-white/5 p-6">
                <div className="flex items-center gap-3 mb-4">
                    <span className="text-3xl">⚖️</span>
                    <div>
                        <p className="text-white font-semibold">Kleros Decentralized Court</p>
                        <p className="text-white/40 text-xs">7-day evidence period → Jury vote → Final ruling</p>
                    </div>
                    {gig?.hasKlerosDispute && (
                        <span className="ml-auto px-3 py-1 rounded-full bg-white/10 text-white/70 border border-white/20 text-xs font-semibold">
                            Dispute #{gig.klerosDisputeId?.toString()}
                        </span>
                    )}
                </div>
                {gig?.hasKlerosDispute ? (
                    <div className="space-y-3">
                        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                            <p className="text-white/70 text-sm">
                                Your case is now before <span className="text-white font-semibold">Kleros Court</span>.
                                Randomly selected jurors will review all submitted evidence and cast their votes.
                                The process typically takes <span className="text-white">3–7 days</span>.
                            </p>
                        </div>
                        <a
                            href={`https://court.kleros.io/cases/${gig.klerosDisputeId}`}
                            target="_blank" rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-white/8 hover:bg-white/15 text-white/70 font-semibold text-sm border border-white/15 transition-all"
                        >
                            View on Kleros Court ↗
                        </a>
                    </div>
                ) : (
                    <div>
                        <p className="text-white/60 text-sm mb-4">
                            Arbitration fee: <span className="text-white font-semibold">
                                {arbitrationCost ? ethers.formatEther(arbitrationCost) + " ETH" : "Fetching..."}
                            </span>
                        </p>
                        {isParty && gig?.status === "DISPUTED_AI" && (
                            <button
                                onClick={handleEscalate}
                                disabled={loading || !arbitrationCost}
                                className="w-full py-3 rounded-xl bg-white hover:bg-gray-100 text-black font-semibold text-sm transition-all disabled:opacity-50"
                            >
                                {loading ? "Creating Kleros Dispute..." : "⚖️ Escalate to Kleros Court"}
                            </button>
                        )}
                    </div>
                )}
            </div>

            {gig?.status === "DISPUTED_KLEROS" && isParty && (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">
                    <p className="text-white font-semibold flex items-center gap-2">
                        <span>📎</span> Submit Evidence to Jury
                    </p>
                    <input
                        type="text"
                        value={evidenceName}
                        onChange={e => setEvidenceName(e.target.value)}
                        placeholder="Evidence title (e.g., 'Final deliverable screenshots')"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/40 transition-colors"
                    />
                    <textarea
                        rows={4}
                        value={evidenceText}
                        onChange={e => setEvidenceText(e.target.value)}
                        placeholder="Describe your evidence. Be specific — jurors will read this when deciding the case..."
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/40 transition-colors resize-none"
                    />
                    <label className="flex items-center gap-3 cursor-pointer group">
                        <div className="flex-1 relative">
                            <input
                                type="file"
                                onChange={e => setFile(e.target.files[0])}
                                className="absolute inset-0 opacity-0 cursor-pointer"
                            />
                            <div className="flex items-center gap-3 py-3 px-4 rounded-xl border border-dashed border-white/20 group-hover:border-white/40 transition-colors">
                                <span className="text-white/40">📂</span>
                                <span className="text-sm text-white/40 group-hover:text-white/60 transition-colors">
                                    {file ? file.name : "Attach file (optional — images, PDFs, zip)"}
                                </span>
                            </div>
                        </div>
                    </label>
                    <button
                        onClick={handleSubmitEvidence}
                        disabled={uploading || !evidenceText.trim()}
                        className="w-full py-3 rounded-xl bg-white hover:bg-gray-100 text-black font-semibold text-sm transition-all disabled:opacity-40"
                    >
                        {uploading ? "Uploading to IPFS & submitting on-chain..." : "Submit Evidence to Kleros"}
                    </button>
                </div>
            )}
        </div>
    );
}

function HumanArbitrationCard() {
    return (
        <div className="rounded-2xl border border-white/15 bg-white/5 p-6 space-y-4">
            <div className="flex items-center gap-3">
                <span className="text-3xl">👤</span>
                <div>
                    <p className="text-white font-semibold">Human Final Arbitration</p>
                    <p className="text-white/40 text-xs">Platform admin (Gnosis Safe multisig) makes the final decision</p>
                </div>
            </div>
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <p className="text-white/70 text-sm">
                    This case has been escalated to <span className="text-white font-semibold">SwaRojgar's admin team</span> for final review.
                    Kleros was unable to reach a verdict. A platform administrator will review all evidence
                    and make an irrevocable decision within <span className="text-white">48–72 hours</span>.
                </p>
            </div>
            <p className="text-white/40 text-xs text-center">
                Contact: <a href="mailto:disputes@swarojgar.io" className="text-white/60 hover:text-white underline">disputes@swarojgar.io</a>
            </p>
        </div>
    );
}

export default function ResolutionCenter() {
    const [gigId, setGigId] = useState("");
    const { wallet, connectWallet, runTx } = useGig();
    const walletAddress = wallet.address;
    const signer = wallet.signer;

    const [inputGigId, setInputGigId]       = useState("");
    const [gig, setGig]                     = useState(null);
    const [proposal, setProposal]           = useState(null);
    const [arbitrationCost, setArbitrationCost] = useState(null);
    const [loading, setLoading]             = useState(false);
    const [error, setError]                 = useState(null);
    const [txStatus, setTxStatus]           = useState("");

    const loadGig = useCallback(async () => {
        if (!gigId || !signer) return;
        setLoading(true); setError(null);
        try {
            const escrow = new ethers.Contract(ESCROW_ADDRESS, ESCROW_ABI, signer);
            const gigData = await escrow.getGig(gigId);
            const statusStr = GigStatus[Number(gigData.status)];

            const formatted = {
                gigId: gigData.gigId,
                client: gigData.client,
                freelancer: gigData.freelancer,
                amount: ethers.formatEther(gigData.amount),
                status: statusStr,
                proofIpfsHash: gigData.proofIpfsHash,
                metaEvidenceUri: gigData.metaEvidenceUri,
                aiProposalUri: gigData.aiProposalUri,
                clientAcceptsAI: gigData.clientAcceptsAI,
                freelancerAcceptsAI: gigData.freelancerAcceptsAI,
                klerosDisputeId: gigData.klerosDisputeId,
                hasKlerosDispute: gigData.hasKlerosDispute,
                klerosRuling: Number(gigData.klerosRuling)
            };
            setGig(formatted);

            if (gigData.aiProposalUri) {
                const cid = gigData.aiProposalUri.replace("/ipfs/", "");
                const res = await fetch(`https://gateway.pinata.cloud/ipfs/${cid}`);
                if (res.ok) setProposal(await res.json());
            }

            const cost = await escrow.getArbitrationCost();
            setArbitrationCost(cost);

        } catch (e) {
            setError(`Failed to load gig: ${e.message}`);
        }
        setLoading(false);
    }, [gigId, signer]);

    useEffect(() => { loadGig(); }, [loadGig]);

    const raiseDisputeAI = async () => {
        if (!signer || !gig) return;
        try {
            setTxStatus("⏳ Raising dispute...");
            const escrow = new ethers.Contract(ESCROW_ADDRESS, ESCROW_ABI, signer);
            const tx = await escrow.raiseDisputeAI(gigId);
            setTxStatus("⏳ Waiting for confirmation...");
            await tx.wait();
            setTxStatus("✅ Dispute raised! AI analysis will begin shortly.");
            await loadGig();
        } catch (e) { setTxStatus(`❌ ${e.message}`); }
    };

    const voteOnAIProposal = async (accept) => {
        if (!signer) return;
        try {
            setTxStatus(`⏳ Submitting vote (${accept ? "Accept" : "Reject"})...`);
            const escrow = new ethers.Contract(ESCROW_ADDRESS, ESCROW_ABI, signer);
            const tx = await escrow.voteOnAIProposal(gigId, accept);
            await tx.wait();
            setTxStatus(accept ? "✅ You accepted the AI verdict." : "✅ Rejected. You can now escalate to Kleros.");
            await loadGig();
        } catch (e) { setTxStatus(`❌ ${e.message}`); }
    };

    const escalateToKleros = async () => {
        if (!signer || !arbitrationCost) return;
        try {
            setTxStatus("⏳ Creating Kleros dispute...");
            const escrow = new ethers.Contract(ESCROW_ADDRESS, ESCROW_ABI, signer);
            const tx = await escrow.escalateToKleros(gigId, { value: arbitrationCost });
            setTxStatus("⏳ Waiting for confirmation...");
            await tx.wait();
            setTxStatus("✅ Dispute created in Kleros Court!");
            await loadGig();
        } catch (e) { setTxStatus(`❌ ${e.message}`); }
    };

    const submitEvidenceToKleros = async ({ name, description, file }) => {
        if (!signer) return;
        try {
            setTxStatus("⏳ Uploading evidence to IPFS...");

            const formData = new FormData();
            formData.append("gigId", gigId);
            formData.append("name", name);
            formData.append("description", description);
            formData.append("submittedBy", isClient ? "client" : "freelancer");
            if (file) formData.append("file", file);

            const res = await fetch(`${BACKEND_URL}/api/dispute/upload-evidence`, {
                method: "POST", body: formData
            });
            const { evidenceUri } = await res.json();

            setTxStatus("⏳ Submitting evidence on-chain...");
            const escrow = new ethers.Contract(ESCROW_ADDRESS, ESCROW_ABI, signer);
            const tx = await escrow.submitEvidenceToKleros(gigId, evidenceUri);
            await tx.wait();
            setTxStatus("✅ Evidence submitted to Kleros!");
        } catch (e) { setTxStatus(`❌ ${e.message}`); }
    };

    const isClient     = walletAddress?.toLowerCase() === gig?.client?.toLowerCase();
    const isFreelancer = walletAddress?.toLowerCase() === gig?.freelancer?.toLowerCase();
    const isParty      = isClient || isFreelancer;

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white">
            <Navbar />

            <div className="max-w-4xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/8 border border-white/15 text-white/60 text-xs font-medium mb-4">
                        3-Tier Dispute Resolution System
                    </div>
                    <h1 className="text-4xl font-black text-white">Resolution Center</h1>
                    <p className="text-white/40 text-sm mt-2">
                        AI Analysis → Kleros Court → Human Admin
                    </p>
                </div>

                {/* Wallet Connect */}
                {!walletAddress ? (
                    <div className="flex justify-center mb-8">
                        <button
                            onClick={connectWallet}
                            className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-white hover:bg-gray-100 text-black font-semibold text-sm transition-all"
                        >
                            🔗 Connect MetaMask
                        </button>
                    </div>
                ) : (
                    <div className="flex justify-center mb-8">
                        <div className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-white/5 border border-white/10">
                            <div className="w-2 h-2 rounded-full bg-white/60 animate-pulse" />
                            <span className="text-white/60 text-xs font-mono">
                                {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                            </span>
                            {isClient && <span className="px-2 py-0.5 rounded-full bg-white/10 text-white/60 text-xs border border-white/15">Client</span>}
                            {isFreelancer && <span className="px-2 py-0.5 rounded-full bg-white/10 text-white/60 text-xs border border-white/15">Freelancer</span>}
                        </div>
                    </div>
                )}

                {/* Gig ID Lookup */}
                <div className="flex gap-3 mb-8">
                    <input
                        type="text"
                        value={inputGigId}
                        onChange={e => setInputGigId(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && setGigId(inputGigId)}
                        placeholder="Enter Gig ID (MongoDB ObjectId)..."
                        className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/40 transition-colors"
                    />
                    <button
                        onClick={() => setGigId(inputGigId)}
                        disabled={!walletAddress || loading}
                        className="px-6 py-3 rounded-2xl bg-white hover:bg-gray-100 text-black font-semibold text-sm transition-all disabled:opacity-40"
                    >
                        {loading ? "Loading..." : "Load Gig"}
                    </button>
                </div>

                {/* Tx status bar */}
                {txStatus && (
                    <div className="mb-6 px-4 py-3 rounded-2xl text-sm bg-white/5 border border-white/10 text-white/70">
                        {txStatus}
                    </div>
                )}

                {loading && <SkeletonDisputePanel />}

                {error && !loading && (
                    <div className="mb-6 px-4 py-3 rounded-2xl text-sm bg-white/5 border border-white/15 text-white/60">
                        ❌ {error}
                    </div>
                )}

                {gig && (
                    <div className="space-y-6">
                        {/* Gig Overview Card */}
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                            <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
                                <div>
                                    <p className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-1">Gig ID</p>
                                    <p className="text-white font-mono text-sm">{gig.gigId}</p>
                                </div>
                                <StatusBadge status={gig.status} />
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
                                <div>
                                    <p className="text-white/40 text-xs mb-1">Escrow Amount</p>
                                    <p className="text-white font-semibold">{gig.amount} SRT</p>
                                </div>
                                <div>
                                    <p className="text-white/40 text-xs mb-1">Client</p>
                                    <p className="text-white/80 font-mono text-xs">{gig.client?.slice(0, 10)}...</p>
                                </div>
                                <div>
                                    <p className="text-white/40 text-xs mb-1">Freelancer</p>
                                    <p className="text-white/80 font-mono text-xs">{gig.freelancer?.slice(0, 10)}...</p>
                                </div>
                            </div>

                            <Stepper status={gig.status} />

                            {gig.proofIpfsHash && (
                                <a
                                    href={`https://gateway.pinata.cloud/ipfs/${gig.proofIpfsHash}`}
                                    target="_blank" rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 text-xs text-white/50 hover:text-white transition-colors"
                                >
                                    📄 View Proof of Work on IPFS ↗
                                </a>
                            )}
                        </div>

                        {/* Tier 1: Raise Dispute */}
                        {gig.status === "PROOF_SUBMITTED" && isParty && (
                            <div className="rounded-2xl border border-white/15 bg-white/5 p-6">
                                <p className="text-white font-semibold mb-2">🤖 Tier 1 — Raise Dispute (AI Review)</p>
                                <p className="text-white/50 text-sm mb-4">
                                    Disagree with the submitted work? Raise a dispute. Our AI will review the brief, proof, and chat history to suggest a resolution.
                                </p>
                                <button
                                    onClick={raiseDisputeAI}
                                    className="px-6 py-3 rounded-xl bg-white hover:bg-gray-100 text-black font-semibold text-sm transition-all"
                                >
                                    🚨 Raise Dispute
                                </button>
                            </div>
                        )}

                        {gig.status === "DISPUTED_AI" && (
                            <div>
                                <p className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-3">🤖 Tier 1 — AI Arbitrator</p>
                                <AIVerdictCard
                                    proposal={proposal}
                                    gigId={gigId}
                                    status={gig.status}
                                    onVote={voteOnAIProposal}
                                    isClient={isClient}
                                    isFreelancer={isFreelancer}
                                    clientAccepts={gig.clientAcceptsAI}
                                    freelancerAccepts={gig.freelancerAcceptsAI}
                                />
                            </div>
                        )}

                        {/* Tier 2: Kleros */}
                        {["DISPUTED_AI", "DISPUTED_KLEROS"].includes(gig.status) && (
                            <div>
                                <p className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-3">⚖️ Tier 2 — Kleros Court</p>
                                <KlerosCard
                                    gig={gig}
                                    onEscalate={escalateToKleros}
                                    onSubmitEvidence={submitEvidenceToKleros}
                                    isParty={isParty}
                                    arbitrationCost={arbitrationCost}
                                />
                            </div>
                        )}

                        {/* Tier 3: Human Admin */}
                        {gig.status === "DISPUTED_HUMAN" && (
                            <div>
                                <p className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-3">👤 Tier 3 — Human Admin</p>
                                <HumanArbitrationCard />
                            </div>
                        )}

                        {/* Resolved */}
                        {["COMPLETED", "REFUNDED"].includes(gig.status) && (
                            <div className="rounded-2xl border border-white/20 bg-white/8 p-6 text-center">
                                <div className="text-5xl mb-3">{gig.status === "COMPLETED" ? "🎉" : "🔄"}</div>
                                <p className="text-white font-bold text-lg mb-1">
                                    {gig.status === "COMPLETED" ? "Freelancer Paid" : "Client Refunded"}
                                </p>
                                <p className="text-white/50 text-sm">
                                    {gig.amount} SRT has been released from escrow.
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {!gig && !loading && gigId && !error && (
                    <div className="text-center py-20 text-white/30">
                        <div className="text-6xl mb-4">🔍</div>
                        <p>No gig found for ID: <span className="font-mono text-white/50">{gigId}</span></p>
                    </div>
                )}

                {!gig && !gigId && (
                    <div className="text-center py-20">
                        <div className="text-6xl mb-4 opacity-30">⚖️</div>
                        <p className="text-white/20 text-sm">Enter a Gig ID above to view its dispute status</p>
                    </div>
                )}
            </div>
        </div>
    );
}
