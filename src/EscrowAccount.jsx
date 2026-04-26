/**
 * EscrowAccount.jsx — Worker (Freelancer) Escrow Dashboard
 *
 * Real on-chain reads:
 *  - Shows all gigs the freelancer is assigned to
 *  - Displays how many SRT tokens are locked per gig
 *  - Lets the freelancer raise a dispute if client hasn't released
 *  - Navigates to Resolution Center for full dispute flow
 *
 * Note: Freelancer CANNOT directly release their own funds —
 *       only the client calls approveWork(), or a dispute verdict releases them.
 */

import React, { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { useNavigate } from "react-router-dom";
import { useGig, pushToast } from "./context/GigContext";
import { SkeletonGigCard } from "./components/Skeleton";
import {
    Lock, Unlock, AlertTriangle, CheckCircle2,
    Clock, Coins, ExternalLink, RefreshCw, ShieldAlert
} from "lucide-react";

// ─── ABIs ─────────────────────────────────────────────────────────────────────
const TOKEN_ABI = [
    "function balanceOf(address account) view returns (uint256)",
    "function decimals() view returns (uint8)",
];

const ESCROW_ABI = [
    "function raiseDisputeAI(string gigId) external",
    "function getGig(string gigId) view returns (tuple(string gigId, uint256 gigNumber, address client, address freelancer, uint256 amount, uint8 status, uint256 createdAt, uint256 deadline, string proofIpfsHash, string metaEvidenceUri, string aiProposalUri, bool clientAcceptsAI, bool freelancerAcceptsAI, uint256 metaEvidenceID, uint256 klerosDisputeId, bool hasKlerosDispute, uint256 klerosRuling))",
];

const TOKEN_ADDRESS  = import.meta.env.VITE_TOKEN_CONTRACT_ADDRESS  || "0x5D3976fc3F92174da8F851a12a5b0056CC6783A0";
const ESCROW_ADDRESS = import.meta.env.VITE_ESCROW_CONTRACT_ADDRESS || "0x8eFa974E68A449B25Db77B73841dc14921A98Ba5";
const BACKEND_URL    = import.meta.env.VITE_BACKEND_URL || "http://localhost:5010";

const GigStatusMap = { 0:"OPEN", 1:"ASSIGNED", 2:"PROOF_SUBMITTED", 3:"DISPUTED_AI", 4:"DISPUTED_KLEROS", 5:"DISPUTED_HUMAN", 6:"COMPLETED", 7:"REFUNDED" };

// ─── Status badge ─────────────────────────────────────────────────────────────
const STATUS_STYLE = {
    OPEN:            "bg-blue-500/10 border-blue-500/20 text-blue-300",
    ASSIGNED:        "bg-yellow-500/10 border-yellow-500/20 text-yellow-300",
    PROOF_SUBMITTED: "bg-purple-500/10 border-purple-500/20 text-purple-300",
    COMPLETED:       "bg-emerald-500/10 border-emerald-500/20 text-emerald-300",
    DISPUTED_AI:     "bg-orange-500/10 border-orange-500/20 text-orange-300",
    DISPUTED_KLEROS: "bg-red-500/10 border-red-500/20 text-red-300",
    DISPUTED_HUMAN:  "bg-pink-500/10 border-pink-500/20 text-pink-300",
    REFUNDED:        "bg-slate-500/10 border-slate-500/20 text-slate-300",
};

function StatusBadge({ status }) {
    return (
        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${STATUS_STYLE[status] || STATUS_STYLE.OPEN}`}>
            {status?.replace(/_/g, " ")}
        </span>
    );
}

// ─── Gig Card ─────────────────────────────────────────────────────────────────
function WorkerGigCard({ gig, onDispute, onView }) {
    const isSettled   = ["COMPLETED", "REFUNDED"].includes(gig.status);
    const isDisputed  = ["DISPUTED_AI","DISPUTED_KLEROS","DISPUTED_HUMAN"].includes(gig.status);
    const canDispute  = gig.status === "PROOF_SUBMITTED"; // submitted but client not yet approved
    const isPending   = gig.status === "ASSIGNED";

    // Deadline proximity
    const deadlineWarning = gig.deadline && !isSettled
        ? gig.deadline - Math.floor(Date.now() / 1000) < 86400 // < 1 day remaining
        : false;

    return (
        <div className="rounded-2xl border border-white/8 bg-white/4 hover:bg-white/5 transition-colors p-5 space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                    {gig.gigNumber && (
                        <span className="block text-cyan-400 text-xs font-bold mb-1">Gig #{gig.gigNumber}</span>
                    )}
                    <p className="text-white font-semibold text-sm">{gig.title || gig.gigId}</p>
                    <p className="text-white/30 text-xs font-mono mt-0.5">{gig.gigId?.slice(0, 24)}...</p>
                </div>
                <div className="text-right space-y-1.5">
                    <StatusBadge status={gig.status}/>
                    <p className="text-cyan-400 font-bold text-lg">{gig.amount} SRT</p>
                </div>
            </div>

            {/* Locked indicator */}
            {!isSettled && !isDisputed && (
                <div className="flex items-center gap-2 py-2 px-3 rounded-xl bg-amber-500/8 border border-amber-500/15">
                    <Lock size={13} className="text-amber-400 shrink-0"/>
                    <p className="text-amber-300/80 text-xs">
                        <span className="font-semibold">{gig.amount} SRT</span> is locked in escrow — will release when client approves your work
                    </p>
                </div>
            )}

            {/* Deadline warning */}
            {deadlineWarning && (
                <div className="flex items-center gap-2 py-2 px-3 rounded-xl bg-red-500/8 border border-red-500/20">
                    <Clock size={13} className="text-red-400 shrink-0"/>
                    <p className="text-red-300/80 text-xs">Deadline is approaching in less than 24 hours!</p>
                </div>
            )}

            {/* Disputed state */}
            {isDisputed && (
                <div className="flex items-center gap-2 py-2 px-3 rounded-xl bg-orange-500/8 border border-orange-500/20">
                    <ShieldAlert size={13} className="text-orange-400 shrink-0"/>
                    <p className="text-orange-300/80 text-xs">
                        Dispute in progress. Funds remain locked until resolution.
                    </p>
                </div>
            )}

            {/* Settled */}
            {gig.status === "COMPLETED" && (
                <div className="flex items-center gap-2 py-2 px-3 rounded-xl bg-emerald-500/8 border border-emerald-500/20">
                    <Unlock size={13} className="text-emerald-400 shrink-0"/>
                    <p className="text-emerald-300/80 text-xs font-semibold">
                        🎉 {gig.amount} SRT has been released to your wallet!
                    </p>
                </div>
            )}

            {gig.status === "REFUNDED" && (
                <div className="flex items-center gap-2 py-2 px-3 rounded-xl bg-slate-500/8 border border-slate-500/20">
                    <RefreshCw size={13} className="text-slate-400 shrink-0"/>
                    <p className="text-slate-300/80 text-xs">Funds refunded to client.</p>
                </div>
            )}

            {/* Proof submitted */}
            {gig.proofIpfsHash && (
                <a
                    href={`https://gateway.pinata.cloud/ipfs/${gig.proofIpfsHash}`}
                    target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 transition-colors"
                >
                    <ExternalLink size={12}/> View your submitted proof
                </a>
            )}

            {/* Waiting for approval */}
            {gig.status === "PROOF_SUBMITTED" && (
                <div className="flex items-center gap-2 py-2 px-3 rounded-xl bg-purple-500/8 border border-purple-500/20">
                    <Clock size={13} className="text-purple-400 shrink-0"/>
                    <p className="text-purple-300/80 text-xs">
                        Proof submitted — waiting for client to approve and release payment.
                    </p>
                </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 flex-wrap">
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
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/6 hover:bg-white/10 text-white/50 hover:text-white text-xs font-semibold transition-all border border-white/8"
                >
                    <ExternalLink size={12}/> Resolution Center
                </button>
            </div>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function WorkerEscrowInterface() {
    const navigate = useNavigate();
    const { wallet, runTx } = useGig();

    const [srtBalance,  setSrtBalance]  = useState("0");
    const [gigs,        setGigs]        = useState([]);
    const [loadingGigs, setLoadingGigs] = useState(true);

    // ── Read SRT balance ──────────────────────────────────────────────────────
    const fetchBalance = useCallback(async () => {
        if (!wallet.signer || !wallet.address) return;
        try {
            const token = new ethers.Contract(TOKEN_ADDRESS, TOKEN_ABI, wallet.signer);
            const raw   = await token.balanceOf(wallet.address);
            const dec   = await token.decimals();
            setSrtBalance(ethers.formatUnits(raw, dec));
        } catch (e) {
            console.error("Balance fetch:", e.message);
        }
    }, [wallet.signer, wallet.address]);

    // ── Fetch assigned gigs ───────────────────────────────────────────────────
    const fetchGigs = useCallback(async () => {
        if (!wallet.address) return;
        setLoadingGigs(true);
        try {
            const token = localStorage.getItem("token");
            const res   = await fetch(
                `${BACKEND_URL}/api/posts?userRole=freelancer&userId=${localStorage.getItem("userId")}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            const data  = await res.json();
            const jobs  = (data.posts || data || []).filter(
                p => p.postType === "job" && (p.assignedFreelancer || p.freelancerWallet === wallet.address)
            );

            if (wallet.signer) {
                const escrow = new ethers.Contract(ESCROW_ADDRESS, ESCROW_ABI, wallet.signer);
                const enriched = await Promise.all(jobs.map(async (post) => {
                    try {
                        const chain = await escrow.getGig(post._id);
                        return {
                            ...post,
                            gigId:        chain.gigId,
                            gigNumber:    Number(chain.gigNumber),
                            amount:       ethers.formatEther(chain.amount),
                            status:       GigStatusMap[Number(chain.status)] || post.status,
                            proofIpfsHash: chain.proofIpfsHash || post.proofIpfsHash,
                            deadline:     Number(chain.deadline),
                        };
                    } catch {
                        return { ...post, gigId: post._id, amount: String(post.srtAmount || 0) };
                    }
                }));
                setGigs(enriched);
            } else {
                setGigs(jobs.map(p => ({ ...p, gigId: p._id, amount: String(p.srtAmount || 0) })));
            }
        } catch (e) {
            console.error("Fetch gigs error:", e.message);
            pushToast("Could not fetch your assigned gigs", "error");
        }
        setLoadingGigs(false);
    }, [wallet.address, wallet.signer]);

    useEffect(() => {
        fetchBalance();
        fetchGigs();
    }, [fetchBalance, fetchGigs]);

    // ── Raise dispute ─────────────────────────────────────────────────────────
    const handleDispute = async (gigId) => {
        const receipt = await runTx(
            () => {
                const escrow = new ethers.Contract(ESCROW_ADDRESS, ESCROW_ABI, wallet.signer);
                return escrow.raiseDisputeAI(gigId);
            },
            "Raising dispute (AI Tier 1)..."
        );
        if (receipt) {
            pushToast("🤖 Dispute raised — AI is analysing the case", "info", 6000);
            await fetchGigs();
        }
    };

    const isConnected   = wallet.connected && wallet.address;
    const totalLocked   = gigs.filter(g => !["COMPLETED","REFUNDED"].includes(g.status)).reduce((s,g) => s + parseFloat(g.amount||0), 0);
    const totalEarned   = gigs.filter(g => g.status === "COMPLETED").reduce((s,g) => s + parseFloat(g.amount||0), 0);
    const activeCount   = gigs.filter(g => !["COMPLETED","REFUNDED"].includes(g.status)).length;

    return (
        <div className="min-h-screen bg-[#070711] text-white">
            {/* Ambient glow */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-1/3 left-1/4 w-80 h-80 bg-cyan-600/8 rounded-full blur-3xl animate-pulse"/>
                <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-violet-500/6 rounded-full blur-3xl animate-pulse" style={{animationDelay:"2s"}}/>
            </div>

            <div className="relative z-10 max-w-4xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-8">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-medium mb-4">
                        👷 Worker Escrow Dashboard
                    </div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 via-white to-violet-400 bg-clip-text text-transparent">
                        My Earnings
                    </h1>
                    <p className="text-white/40 text-sm mt-1">Track locked SRT · Raise disputes · Get paid on approval</p>
                </div>

                {/* Stat cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                    <div className="rounded-2xl border border-white/8 bg-white/4 p-5">
                        <div className="flex items-center gap-2 mb-2">
                            <Coins size={16} className="text-cyan-400"/>
                            <p className="text-white/50 text-xs font-semibold uppercase tracking-wider">Wallet Balance</p>
                        </div>
                        <p className="text-white font-bold text-2xl">{parseFloat(srtBalance).toFixed(2)}</p>
                        <p className="text-white/30 text-xs mt-0.5">SRT in your wallet</p>
                    </div>

                    <div className="rounded-2xl border border-amber-500/20 bg-amber-500/6 p-5">
                        <div className="flex items-center gap-2 mb-2">
                            <Lock size={16} className="text-amber-400"/>
                            <p className="text-amber-300/70 text-xs font-semibold uppercase tracking-wider">Pending Release</p>
                        </div>
                        <p className="text-amber-300 font-bold text-2xl">{totalLocked.toFixed(2)}</p>
                        <p className="text-amber-300/40 text-xs mt-0.5">{activeCount} gig(s) in progress</p>
                    </div>

                    <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/6 p-5">
                        <div className="flex items-center gap-2 mb-2">
                            <CheckCircle2 size={16} className="text-emerald-400"/>
                            <p className="text-emerald-300/70 text-xs font-semibold uppercase tracking-wider">Total Earned</p>
                        </div>
                        <p className="text-emerald-300 font-bold text-2xl">{totalEarned.toFixed(2)}</p>
                        <p className="text-emerald-300/40 text-xs mt-0.5">SRT released to you</p>
                    </div>
                </div>

                {/* Gig list header */}
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-white font-semibold">Assigned Gigs</h2>
                    <button
                        onClick={() => { fetchBalance(); fetchGigs(); }}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/6 hover:bg-white/10 text-white/50 hover:text-white text-xs font-semibold transition-all border border-white/6"
                    >
                        <RefreshCw size={12}/> Refresh
                    </button>
                </div>

                {/* Not connected */}
                {!isConnected && (
                    <div className="rounded-2xl border border-white/8 bg-white/4 p-10 text-center">
                        <p className="text-4xl mb-3">🔗</p>
                        <p className="text-white/50 text-sm">Connect your wallet in the navbar to view your assigned gigs</p>
                    </div>
                )}

                {/* Loading skeletons */}
                {isConnected && loadingGigs && (
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => <SkeletonGigCard key={i}/>)}
                    </div>
                )}

                {/* Gig rows */}
                {isConnected && !loadingGigs && gigs.length > 0 && (
                    <div className="space-y-4">
                        {gigs.map(gig => (
                            <WorkerGigCard
                                key={gig.gigId || gig._id}
                                gig={gig}
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
                        <p className="text-white/50 text-sm">No assigned gigs yet. Browse the job board and accept a gig to get started.</p>
                        <button
                            onClick={() => navigate("/")}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold transition-all mt-2"
                        >
                            Browse Jobs →
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
