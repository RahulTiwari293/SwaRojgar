/**
 * customerEscrow.jsx — Client (Buyer) Escrow Dashboard
 *
 * Real blockchain integration:
 *  - Reads SRT token balance from ERC-20 contract
 *  - Calls token.approve() then escrow.createGig() to LOCK SRT
 *  - Calls escrow.approveWork() to RELEASE SRT to the freelancer
 *  - Calls escrow.raiseDisputeAI() to open a dispute
 *  - Shows live on-chain status for every active gig
 *
 * Uses GigContext for wallet — no local wallet state.
 */

import React, { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { useNavigate } from "react-router-dom";
import { useGig, pushToast } from "./context/GigContext";
import { SkeletonGigCard } from "./components/Skeleton";
import {
    Lock, Unlock, AlertTriangle, CheckCircle2,
    Coins, ArrowDownCircle, ArrowUpCircle,
    ExternalLink, RefreshCw, PlusCircle
} from "lucide-react";

// ─── ABIs ─────────────────────────────────────────────────────────────────────
const TOKEN_ABI = [
    "function balanceOf(address account) view returns (uint256)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function decimals() view returns (uint8)",
];

const ESCROW_ABI = [
    "function createGig(string gigId, uint256 amount, uint256 deadline, string metaEvidenceUri) external",
    "function approveWork(string gigId) external",
    "function raiseDisputeAI(string gigId) external",
    "function getGig(string gigId) view returns (tuple(string gigId, uint256 gigNumber, address client, address freelancer, uint256 amount, uint8 status, uint256 createdAt, uint256 deadline, string proofIpfsHash, string metaEvidenceUri, string aiProposalUri, bool clientAcceptsAI, bool freelancerAcceptsAI, uint256 metaEvidenceID, uint256 klerosDisputeId, bool hasKlerosDispute, uint256 klerosRuling))",
];

const TOKEN_ADDRESS  = import.meta.env.VITE_TOKEN_CONTRACT_ADDRESS  || "0xfdA41C31D6630980352F590c753E9Ee5E2964906";
const ESCROW_ADDRESS = import.meta.env.VITE_ESCROW_CONTRACT_ADDRESS || "0x5996AD515E407F1569278a1642cE9f259c1010eA";
const BACKEND_URL    = import.meta.env.VITE_BACKEND_URL || "http://localhost:5010";

// Gig status labels + colours
const STATUS_META = {
    OPEN:            { label: "Open",          color: "text-blue-400",    bg: "bg-blue-500/10",    border: "border-blue-500/20",    icon: <PlusCircle size={14}/> },
    ASSIGNED:        { label: "Assigned",      color: "text-yellow-400",  bg: "bg-yellow-500/10",  border: "border-yellow-500/20",  icon: <Lock size={14}/> },
    PROOF_SUBMITTED: { label: "Proof In",      color: "text-purple-400",  bg: "bg-purple-500/10",  border: "border-purple-500/20",  icon: <ArrowUpCircle size={14}/> },
    COMPLETED:       { label: "Completed",     color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", icon: <CheckCircle2 size={14}/> },
    DISPUTED_AI:     { label: "AI Review",     color: "text-orange-400",  bg: "bg-orange-500/10",  border: "border-orange-500/20",  icon: <AlertTriangle size={14}/> },
    DISPUTED_KLEROS: { label: "Kleros Court",  color: "text-red-400",     bg: "bg-red-500/10",     border: "border-red-500/20",     icon: <AlertTriangle size={14}/> },
    DISPUTED_HUMAN:  { label: "Human Review",  color: "text-pink-400",    bg: "bg-pink-500/10",    border: "border-pink-500/20",    icon: <AlertTriangle size={14}/> },
    REFUNDED:        { label: "Refunded",      color: "text-slate-400",   bg: "bg-slate-500/10",   border: "border-slate-500/20",   icon: <Unlock size={14}/> },
};

const GigStatusMap = { 0:"OPEN", 1:"ASSIGNED", 2:"PROOF_SUBMITTED", 3:"DISPUTED_AI", 4:"DISPUTED_KLEROS", 5:"DISPUTED_HUMAN", 6:"COMPLETED", 7:"REFUNDED" };

// ─── StatusBadge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
    const m = STATUS_META[status] || STATUS_META.OPEN;
    return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${m.bg} ${m.border} ${m.color}`}>
            {m.icon}{m.label}
        </span>
    );
}

// ─── GigRow ───────────────────────────────────────────────────────────────────
function GigRow({ gig, onApprove, onDispute, onView }) {
    const canApprove  = gig.status === "PROOF_SUBMITTED";
    const canDispute  = gig.status === "PROOF_SUBMITTED";
    const isSettled   = ["COMPLETED","REFUNDED"].includes(gig.status);

    return (
        <div className="rounded-2xl border border-white/8 bg-white/4 hover:bg-white/6 transition-colors p-5 space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        {gig.gigNumber && (
                            <span className="text-violet-400 text-xs font-bold">Gig #{gig.gigNumber}</span>
                        )}
                        <StatusBadge status={gig.status} />
                    </div>
                    <p className="text-white font-semibold text-sm">{gig.title || gig.gigId}</p>
                    <p className="text-white/40 text-xs font-mono mt-1">{gig.gigId}</p>
                </div>
                <div className="text-right shrink-0">
                    <p className="text-emerald-400 font-bold text-lg">{gig.amount} SRT</p>
                    <p className="text-white/30 text-xs">
                        {gig.status === "COMPLETED" ? "Released" : "Locked in escrow"}
                    </p>
                </div>
            </div>

            {/* Proof hash */}
            {gig.proofIpfsHash && (
                <a
                    href={`https://gateway.pinata.cloud/ipfs/${gig.proofIpfsHash}`}
                    target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 transition-colors"
                >
                    <ExternalLink size={12}/> View submitted proof on IPFS
                </a>
            )}

            {/* Token lock animation */}
            {!isSettled && (
                <div className="flex items-center gap-2 py-2 px-3 rounded-xl bg-amber-500/8 border border-amber-500/15">
                    <Lock size={13} className="text-amber-400 shrink-0"/>
                    <p className="text-amber-300/80 text-xs">
                        <span className="font-semibold">{gig.amount} SRT</span> is locked in the smart contract escrow
                    </p>
                </div>
            )}

            {/* Action row */}
            {!isSettled && (
                <div className="flex gap-2 flex-wrap">
                    {canApprove && (
                        <button
                            onClick={() => onApprove(gig.gigId)}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-all duration-200"
                        >
                            <Unlock size={13}/> Approve & Release SRT
                        </button>
                    )}
                    {canDispute && (
                        <button
                            onClick={() => onDispute(gig.gigId)}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-600/80 hover:bg-orange-500 text-white text-xs font-semibold transition-all duration-200"
                        >
                            <AlertTriangle size={13}/> Raise Dispute
                        </button>
                    )}
                    <button
                        onClick={() => onView(gig.gigId)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/8 hover:bg-white/12 text-white/60 hover:text-white text-xs font-semibold transition-all duration-200 border border-white/8"
                    >
                        <ExternalLink size={13}/> Resolution Center
                    </button>
                </div>
            )}

            {isSettled && (
                <div className={`flex items-center gap-2 py-2 px-3 rounded-xl border ${
                    gig.status === "COMPLETED"
                        ? "bg-emerald-500/8 border-emerald-500/20 text-emerald-300"
                        : "bg-slate-500/8 border-slate-500/20 text-slate-300"
                } text-xs`}>
                    {gig.status === "COMPLETED" ? <Unlock size={13}/> : <RefreshCw size={13}/>}
                    {gig.status === "COMPLETED"
                        ? `${gig.amount} SRT released to freelancer`
                        : `${gig.amount} SRT refunded to you`}
                </div>
            )}
        </div>
    );
}

// ─── Lock Dialog ──────────────────────────────────────────────────────────────
function LockDialog({ onClose, onLock, srtBalance, loading }) {
    const [gigId,    setGigId]    = useState("");
    const [amount,   setAmount]   = useState("");
    const [deadline, setDeadline] = useState("");
    const [title,    setTitle]    = useState("");

    const handleSubmit = () => {
        if (!gigId || !amount || !title) {
            pushToast("Please fill in GigID, Title and Amount", "warning");
            return;
        }
        const parsed = parseFloat(amount);
        if (isNaN(parsed) || parsed <= 0) {
            pushToast("Enter a valid SRT amount", "warning"); return;
        }
        if (parseFloat(amount) > parseFloat(srtBalance)) {
            pushToast(`Insufficient SRT balance (you have ${srtBalance} SRT)`, "error"); return;
        }
        const dl = deadline ? Math.floor(new Date(deadline).getTime() / 1000) : 0;
        onLock({ gigId, amount: parsed.toString(), deadline: dl, title });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}/>
            <div className="relative w-full max-w-md rounded-3xl border border-white/10 bg-slate-900/95 backdrop-blur-xl p-6 space-y-5 shadow-2xl">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-white font-bold text-lg">🔒 Lock SRT in Escrow</h2>
                        <p className="text-white/40 text-xs mt-0.5">Funds are held until you approve the work</p>
                    </div>
                    <button onClick={onClose} className="text-white/30 hover:text-white text-xl transition-colors">✕</button>
                </div>

                {/* Balance indicator */}
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-violet-500/10 border border-violet-500/20">
                    <Coins size={14} className="text-violet-400"/>
                    <span className="text-violet-300 text-xs">Your SRT balance: <strong>{parseFloat(srtBalance || "0").toFixed(2)} SRT</strong></span>
                </div>

                <div className="space-y-3">
                    <div>
                        <label className="text-white/50 text-xs mb-1.5 block">Gig ID <span className="text-red-400">*</span></label>
                        <input
                            value={gigId} onChange={e => setGigId(e.target.value)}
                            placeholder="MongoDB post ID (e.g. 507f1f77bcf86cd799439011)"
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-violet-500/60 transition-colors"
                        />
                    </div>
                    <div>
                        <label className="text-white/50 text-xs mb-1.5 block">Gig Title <span className="text-red-400">*</span></label>
                        <input
                            value={title} onChange={e => setTitle(e.target.value)}
                            placeholder="e.g. Build a React dashboard"
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-violet-500/60 transition-colors"
                        />
                    </div>
                    <div>
                        <label className="text-white/50 text-xs mb-1.5 block">SRT Amount to Lock <span className="text-red-400">*</span></label>
                        <input
                            type="number" min="1" step="0.01"
                            value={amount} onChange={e => setAmount(e.target.value)}
                            placeholder="e.g. 100"
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-violet-500/60 transition-colors"
                        />
                    </div>
                    <div>
                        <label className="text-white/50 text-xs mb-1.5 block">Deadline (optional)</label>
                        <input
                            type="date"
                            value={deadline} onChange={e => setDeadline(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white/80 focus:outline-none focus:border-violet-500/60 transition-colors"
                        />
                    </div>
                </div>

                <div className="bg-amber-500/8 border border-amber-500/20 rounded-xl p-3 text-xs text-amber-300/80">
                    <strong>Two-step process:</strong> First you'll approve the escrow to spend your SRT, then the tokens will be locked. Both require MetaMask confirmation.
                </div>

                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 py-3 rounded-xl bg-white/6 hover:bg-white/10 text-white/60 font-semibold text-sm transition-all border border-white/8">
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="flex-1 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white font-semibold text-sm transition-all disabled:opacity-40"
                    >
                        {loading ? "Locking..." : "🔒 Lock SRT"}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CustomerEscrowInterface() {
    const navigate = useNavigate();
    const { wallet, runTx } = useGig();

    const [srtBalance,   setSrtBalance]   = useState("0");
    const [gigs,         setGigs]         = useState([]);
    const [loadingGigs,  setLoadingGigs]  = useState(true);
    const [showLockForm, setShowLockForm] = useState(false);
    const [locking,      setLocking]      = useState(false);

    // ── Read SRT balance ──────────────────────────────────────────────────────
    const fetchBalance = useCallback(async () => {
        if (!wallet.signer || !wallet.address) return;
        try {
            const token = new ethers.Contract(TOKEN_ADDRESS, TOKEN_ABI, wallet.signer);
            const raw   = await token.balanceOf(wallet.address);
            const dec   = await token.decimals();
            setSrtBalance(ethers.formatUnits(raw, dec));
        } catch (e) {
            console.error("Balance fetch error:", e.message);
        }
    }, [wallet.signer, wallet.address]);

    // ── Fetch client gigs from backend ────────────────────────────────────────
    const fetchGigs = useCallback(async () => {
        if (!wallet.address) return;
        setLoadingGigs(true);
        try {
            const token  = localStorage.getItem("token");
            const res    = await fetch(`${BACKEND_URL}/api/posts?userRole=client&userId=${localStorage.getItem("userId")}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data   = await res.json();
            const jobs   = (data.posts || data || []).filter(p => p.postType === "job");

            // Enrich with on-chain data for each gig that has blockchain status
            if (wallet.signer) {
                const escrow = new ethers.Contract(ESCROW_ADDRESS, ESCROW_ABI, wallet.signer);
                const enriched = await Promise.all(jobs.map(async (post) => {
                    try {
                        const chain = await escrow.getGig(post._id);
                        return {
                            ...post,
                            gigId:     chain.gigId,
                            gigNumber: Number(chain.gigNumber),
                            amount:    ethers.formatEther(chain.amount),
                            status:    GigStatusMap[Number(chain.status)] || post.status,
                            proofIpfsHash: chain.proofIpfsHash || post.proofIpfsHash,
                        };
                    } catch {
                        // Gig not yet on-chain — use DB data
                        return { ...post, gigId: post._id, amount: String(post.srtAmount || 0) };
                    }
                }));
                setGigs(enriched);
            } else {
                setGigs(jobs.map(p => ({ ...p, gigId: p._id, amount: String(p.srtAmount || 0) })));
            }
        } catch (e) {
            console.error("Fetch gigs error:", e.message);
            pushToast("Could not fetch your gigs", "error");
        }
        setLoadingGigs(false);
    }, [wallet.address, wallet.signer]);

    useEffect(() => {
        fetchBalance();
        fetchGigs();
    }, [fetchBalance, fetchGigs]);

    // ── LOCK: approve() → createGig() ────────────────────────────────────────
    const handleLockSRT = async ({ gigId, amount, deadline, title }) => {
        setLocking(true);
        try {
            const token  = new ethers.Contract(TOKEN_ADDRESS, TOKEN_ABI, wallet.signer);
            const escrow = new ethers.Contract(ESCROW_ADDRESS, ESCROW_ABI, wallet.signer);
            const dec    = await token.decimals();
            const rawAmt = ethers.parseUnits(amount, dec);

            // Step 1: Approve escrow to spend SRT
            pushToast("Step 1/2 — Approving SRT spend...", "loading", 20000);
            const approveTx = await token.approve(ESCROW_ADDRESS, rawAmt);
            await approveTx.wait();
            pushToast("✅ Approval confirmed", "success");

            // Step 2: Upload MetaEvidence to IPFS, then createGig()
            pushToast("Step 2/2 — Locking SRT in escrow...", "loading", 30000);
            let metaUri = `/ipfs/QmPlaceholder_${gigId}`; // fallback
            try {
                const meRes = await fetch(`${BACKEND_URL}/api/dispute/upload-meta`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ gigId, title, description: title, budget: amount })
                });
                const meData = await meRes.json();
                if (meData.metaEvidenceUri) metaUri = meData.metaEvidenceUri;
            } catch { /* non-fatal — use placeholder */ }

            const receipt = await runTx(
                () => escrow.createGig(gigId, rawAmt, deadline, metaUri),
                "Creating gig and locking SRT..."
            );

            if (receipt) {
                pushToast(`🔒 ${amount} SRT locked in escrow for Gig #${gigId}`, "success", 6000);
                setShowLockForm(false);
                await fetchBalance();
                await fetchGigs();
            }
        } catch (e) {
            pushToast(`Failed: ${e.reason || e.message}`, "error");
        }
        setLocking(false);
    };

    // ── RELEASE: approveWork() ────────────────────────────────────────────────
    const handleApproveWork = async (gigId) => {
        const receipt = await runTx(
            () => {
                const escrow = new ethers.Contract(ESCROW_ADDRESS, ESCROW_ABI, wallet.signer);
                return escrow.approveWork(gigId);
            },
            "Releasing SRT to freelancer..."
        );
        if (receipt) {
            pushToast("💸 SRT released to the freelancer!", "success", 6000);
            await fetchBalance();
            await fetchGigs();
        }
    };

    // ── DISPUTE: raiseDisputeAI() ─────────────────────────────────────────────
    const handleDispute = async (gigId) => {
        const receipt = await runTx(
            () => {
                const escrow = new ethers.Contract(ESCROW_ADDRESS, ESCROW_ABI, wallet.signer);
                return escrow.raiseDisputeAI(gigId);
            },
            "Raising dispute (Tier 1 — AI Review)..."
        );
        if (receipt) {
            pushToast("🤖 Dispute raised — AI is now analyzing the case", "info", 6000);
            await fetchGigs();
        }
    };

    const isConnected = wallet.connected && wallet.address;

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-[#070711] text-white">
            {/* Ambient background */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-violet-600/8 rounded-full blur-3xl animate-pulse"/>
                <div className="absolute bottom-1/3 left-1/4 w-80 h-80 bg-cyan-500/6 rounded-full blur-3xl animate-pulse" style={{animationDelay:"1.5s"}}/>
            </div>

            <div className="relative z-10 max-w-4xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-8">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-medium mb-4">
                        🔒 Client Escrow Dashboard
                    </div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-400 via-white to-cyan-400 bg-clip-text text-transparent">
                        My Escrow
                    </h1>
                    <p className="text-white/40 text-sm mt-1">Lock SRT on gig creation · Release on approval · Open dispute if needed</p>
                </div>

                {/* Balance cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                    {/* SRT Balance */}
                    <div className="rounded-2xl border border-white/8 bg-white/4 p-5">
                        <div className="flex items-center gap-2 mb-2">
                            <Coins size={16} className="text-violet-400"/>
                            <p className="text-white/50 text-xs font-semibold uppercase tracking-wider">SRT Balance</p>
                        </div>
                        {isConnected ? (
                            <p className="text-white font-bold text-2xl">{parseFloat(srtBalance).toFixed(2)}</p>
                        ) : (
                            <p className="text-white/30 text-sm">Connect wallet</p>
                        )}
                        <p className="text-white/30 text-xs mt-0.5">SwaRojgar Token</p>
                    </div>

                    {/* Locked */}
                    <div className="rounded-2xl border border-amber-500/20 bg-amber-500/6 p-5">
                        <div className="flex items-center gap-2 mb-2">
                            <Lock size={16} className="text-amber-400"/>
                            <p className="text-amber-300/70 text-xs font-semibold uppercase tracking-wider">Locked in Escrow</p>
                        </div>
                        <p className="text-amber-300 font-bold text-2xl">
                            {gigs.filter(g => !["COMPLETED","REFUNDED"].includes(g.status))
                                 .reduce((sum, g) => sum + parseFloat(g.amount || 0), 0).toFixed(2)}
                        </p>
                        <p className="text-amber-300/40 text-xs mt-0.5">Across {gigs.filter(g => !["COMPLETED","REFUNDED"].includes(g.status)).length} active gig(s)</p>
                    </div>

                    {/* Released */}
                    <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/6 p-5">
                        <div className="flex items-center gap-2 mb-2">
                            <Unlock size={16} className="text-emerald-400"/>
                            <p className="text-emerald-300/70 text-xs font-semibold uppercase tracking-wider">Released</p>
                        </div>
                        <p className="text-emerald-300 font-bold text-2xl">
                            {gigs.filter(g => g.status === "COMPLETED")
                                 .reduce((sum, g) => sum + parseFloat(g.amount || 0), 0).toFixed(2)}
                        </p>
                        <p className="text-emerald-300/40 text-xs mt-0.5">Paid out to freelancers</p>
                    </div>
                </div>

                {/* Lock SRT CTA */}
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-white font-semibold">Your Gigs</h2>
                    <div className="flex gap-2">
                        <button
                            onClick={() => { fetchBalance(); fetchGigs(); }}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/6 hover:bg-white/10 text-white/50 hover:text-white text-xs font-semibold transition-all border border-white/6"
                        >
                            <RefreshCw size={12}/> Refresh
                        </button>
                        {isConnected && (
                            <button
                                onClick={() => setShowLockForm(true)}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white text-xs font-semibold transition-all shadow-lg shadow-violet-500/20"
                            >
                                <ArrowDownCircle size={13}/> Lock SRT in Escrow
                            </button>
                        )}
                    </div>
                </div>

                {/* Not connected state */}
                {!isConnected && (
                    <div className="rounded-2xl border border-white/8 bg-white/4 p-10 text-center">
                        <p className="text-4xl mb-3">🔗</p>
                        <p className="text-white/50 text-sm">Connect your MetaMask wallet to view and manage your escrows</p>
                    </div>
                )}

                {/* Loading */}
                {isConnected && loadingGigs && (
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => <SkeletonGigCard key={i}/>)}
                    </div>
                )}

                {/* Gig list */}
                {isConnected && !loadingGigs && gigs.length > 0 && (
                    <div className="space-y-4">
                        {gigs.map(gig => (
                            <GigRow
                                key={gig.gigId || gig._id}
                                gig={gig}
                                onApprove={handleApproveWork}
                                onDispute={handleDispute}
                                onView={(id) => navigate(`/ResolutionCenter?gig=${id}`)}
                            />
                        ))}
                    </div>
                )}

                {/* Empty state */}
                {isConnected && !loadingGigs && gigs.length === 0 && (
                    <div className="rounded-2xl border border-white/8 bg-white/4 p-10 text-center space-y-3">
                        <p className="text-5xl opacity-30">📋</p>
                        <p className="text-white/50 text-sm">No gigs yet. Create a job post and lock SRT to get started.</p>
                        <button
                            onClick={() => setShowLockForm(true)}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-all mt-2"
                        >
                            <ArrowDownCircle size={14}/> Lock SRT in Escrow
                        </button>
                    </div>
                )}
            </div>

            {/* Lock dialog */}
            {showLockForm && (
                <LockDialog
                    srtBalance={srtBalance}
                    loading={locking}
                    onClose={() => setShowLockForm(false)}
                    onLock={handleLockSRT}
                />
            )}
        </div>
    );
}
