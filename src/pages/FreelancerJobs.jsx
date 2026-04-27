/**
 * FreelancerDashboard.jsx — Worker Dashboard
 *
 * Sections:
 *  - Animated hero banner with stats
 *  - Live SRT balance + earnings breakdown
 *  - Active gigs with Submit Work / Dispute actions
 *  - Browse open jobs feed
 *  - Quick-action sidebar
 *  - Scroll-triggered fade animations throughout
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import { ethers } from "ethers";
import { useNavigate } from "react-router-dom";
import { useGig, pushToast } from "../context/GigContext";
import { SkeletonGigCard } from "../components/Skeleton";
import Navbar from "../navbar";
import freelancerImg from "../assets/freelancer_dashboard_hero.png";

const BACKEND     = import.meta.env.VITE_BACKEND_URL ?? "http://localhost:5010";
const RPC_URL     = import.meta.env.VITE_RPC_URL || "https://rpc.sepolia.org";
const readProvider = new ethers.JsonRpcProvider(RPC_URL);
const ESCROW_ABI = [
    "function acceptGig(string gigId) external",
    "function raiseDisputeAI(string gigId) external",
    "function getGig(string gigId) view returns (tuple(string gigId, uint256 gigNumber, address client, address freelancer, uint256 amount, uint8 status, uint256 createdAt, uint256 deadline, string proofIpfsHash, string metaEvidenceUri, string aiProposalUri, bool clientAcceptsAI, bool freelancerAcceptsAI, uint256 metaEvidenceID, uint256 klerosDisputeId, bool hasKlerosDispute, uint256 klerosRuling))",
];
const TOKEN_ABI   = ["function balanceOf(address) view returns(uint256)", "function decimals() view returns(uint8)"];
const ESCROW_ADDR = (import.meta.env.VITE_ESCROW_CONTRACT_ADDRESS || "0x8eFa974E68A449B25Db77B73841dc14921A98Ba5").trim();
const TOKEN_ADDR  = (import.meta.env.VITE_TOKEN_CONTRACT_ADDRESS  || "0x5D3976fc3F92174da8F851a12a5b0056CC6783A0").trim();

const STATUS_MAP = { 0:"OPEN",1:"ASSIGNED",2:"PROOF_SUBMITTED",3:"DISPUTED_AI",4:"DISPUTED_KLEROS",5:"DISPUTED_HUMAN",6:"COMPLETED",7:"REFUNDED" };

// ─── Scroll-fade hook ──────────────────────────────────────────────────────────
function useFade(delay = 0) {
  const ref = useRef(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVis(true); obs.disconnect(); }}, { threshold: 0.1 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return [ref, vis, delay];
}

// ─── Animated counter ─────────────────────────────────────────────────────────
function Counter({ target, suffix = "" }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    const n = parseFloat(target) || 0;
    let start = 0;
    const step = n / 40;
    const timer = setInterval(() => {
      start += step;
      if (start >= n) { setVal(n); clearInterval(timer); }
      else setVal(start);
    }, 30);
    return () => clearInterval(timer);
  }, [target]);
  return <span>{typeof target === "number" ? val.toFixed(2) : Math.round(val)}{suffix}</span>;
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
const STATUS_STYLES = {
  OPEN:            "bg-blue-500/15 border-blue-500/30 text-blue-300",
  ASSIGNED:        "bg-yellow-500/15 border-yellow-500/30 text-yellow-300",
  PROOF_SUBMITTED: "bg-white/20 border-white/30 text-white font-bold",
  COMPLETED:       "bg-white/10 border-white/20 text-white/70",
  DISPUTED_AI:     "bg-orange-500/15 border-orange-500/30 text-orange-300",
  DISPUTED_KLEROS: "bg-red-500/15 border-red-500/30 text-red-300",
  DISPUTED_HUMAN:  "bg-pink-500/15 border-pink-500/30 text-pink-300",
  REFUNDED:        "bg-slate-500/15 border-slate-500/30 text-slate-300",
};
function StatusBadge({ s }) {
  return <span className={`px-2.5 py-1 text-xs font-bold rounded-full border ${STATUS_STYLES[s]||STATUS_STYLES.OPEN}`}>{s?.replace(/_/g," ")}</span>;
}

// ─── GigId Row ────────────────────────────────────────────────────────────────
function GigIdRow({ id }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(id||"").then(() => { setCopied(true); setTimeout(()=>setCopied(false), 1500); });
  };
  return (
    <div className="flex items-center gap-1.5 mt-0.5">
      <p className="text-white/35 text-xs font-mono break-all leading-tight">{id}</p>
      <button onClick={copy} title="Copy ID"
        className="shrink-0 text-white/25 hover:text-white/70 transition-colors text-[10px] leading-none">
        {copied ? "✓" : "⧉"}
      </button>
    </div>
  );
}

// ─── Job Card ─────────────────────────────────────────────────────────────────
function JobCard({ job, onSubmit, onDispute, onView, idx }) {
  const [ref, vis] = useFade(idx * 80);
  const settled = ["COMPLETED","REFUNDED"].includes(job.status);
  const canSubmit  = job.status === "ASSIGNED";
  const canDispute = job.status === "PROOF_SUBMITTED";

  return (
    <div ref={ref} style={{ transitionDelay: `${idx*80}ms` }}
      className={`group rounded-2xl border border-white/8 bg-white/4 hover:bg-white/6 hover:border-white/20 backdrop-blur-sm p-5 transition-all duration-500 hover:scale-[1.01] hover:shadow-xl hover:shadow-black/20
        ${vis ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
      <div className="flex items-start justify-between gap-4 mb-3 flex-wrap">
        <div>
          {job.gigNumber && <p className="text-white/70 text-xs font-bold mb-1">Gig #{job.gigNumber}</p>}
          <h3 className="text-white font-semibold text-base">{job.title || "Untitled Gig"}</h3>
          <GigIdRow id={job.gigId||job._id} />
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <StatusBadge s={job.status} />
          <span className="text-white/70 font-bold text-lg">{job.amount} SRT</span>
        </div>
      </div>

      {job.content && <p className="text-white/40 text-sm mb-3 line-clamp-2">{job.content}</p>}

      {/* Divider */}
      <div className="h-px bg-white/5 mb-3"/>

      {/* Locked funds badge */}
      {!settled && (
        <div className="flex items-center gap-2 mb-3 py-1.5 px-3 rounded-lg bg-white/5 border border-white/15">
          <span className="text-white/70 text-xs">🔒</span>
          <span className="text-white/50 text-xs">{job.amount} SRT locked in escrow</span>
        </div>
      )}
      {job.status === "COMPLETED" && (
        <div className="flex items-center gap-2 mb-3 py-1.5 px-3 rounded-lg bg-white/6 border border-white/15">
          <span className="text-xs">🎉</span>
          <span className="text-white/70 text-xs font-semibold">{job.amount} SRT paid to your wallet!</span>
        </div>
      )}
      {job.status === "DISPUTED_AI" && (
        <div className="flex items-center gap-2 mb-3 py-1.5 px-3 rounded-lg bg-orange-500/10 border border-orange-500/25">
          <span className="text-xs">🤖</span>
          <span className="text-orange-300 text-xs font-semibold">AI is reviewing this dispute</span>
        </div>
      )}
      {job.status === "DISPUTED_KLEROS" && (
        <div className="flex items-center gap-2 mb-3 py-1.5 px-3 rounded-lg bg-red-500/10 border border-red-500/25">
          <span className="text-xs">⚖️</span>
          <span className="text-red-300 text-xs font-semibold">Kleros jurors are voting on this case</span>
        </div>
      )}
      {job.status === "DISPUTED_HUMAN" && (
        <div className="flex items-center gap-2 mb-3 py-1.5 px-3 rounded-lg bg-pink-500/10 border border-pink-500/25">
          <span className="text-xs">👤</span>
          <span className="text-pink-300 text-xs font-semibold">Awaiting human admin arbitration</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 flex-wrap">
        {canSubmit && (
          <button onClick={() => onSubmit(job)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-gray-100 text-black text-xs font-bold transition-all hover:scale-105 shadow-lg">
            📤 Submit Work
          </button>
        )}
        {canDispute && (
          <button onClick={() => onDispute(job.gigId||job._id)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-600/70 hover:bg-orange-500 text-white text-xs font-bold transition-all hover:scale-105">
            ⚠️ Raise Dispute
          </button>
        )}
        <button onClick={() => onView(job.gigId||job._id)} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/6 hover:bg-white/10 text-white/50 hover:text-white text-xs font-semibold transition-all border border-white/8">
          ⚖️ Resolution
        </button>
      </div>
    </div>
  );
}

// ─── Browse Job Card ──────────────────────────────────────────────────────────
function BrowseCard({ job, onApply, idx }) {
  const [ref, vis] = useFade(idx * 60);
  const [applying, setApplying] = useState(false);
  const handle = async () => {
    setApplying(true);
    await onApply(job);
    setApplying(false);
  };
  return (
    <div ref={ref} style={{ transitionDelay:`${idx*60}ms` }}
      className={`group rounded-2xl border border-white/8 bg-white/4 hover:bg-white/6 hover:border-white/20 p-5 transition-all duration-500 hover:scale-[1.01] hover:shadow-lg hover:shadow-black/20 cursor-pointer
        ${vis ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
      <div className="flex items-start justify-between gap-4 mb-2 flex-wrap">
        <div>
          <h3 className="text-white font-semibold text-sm group-hover:text-white transition-colors">{job.title}</h3>
          <p className="text-white/40 text-xs mt-0.5">
            Posted by {job.userId?.firstName} {job.userId?.lastName}
          </p>
        </div>
        <span className="text-white font-bold text-base shrink-0">{job.srtAmount} SRT</span>
      </div>
      <p className="text-white/40 text-xs mb-3 line-clamp-2">{job.content}</p>
      <div className="flex items-center justify-between">
        {job.deadline && <span className="text-white/30 text-xs">📅 Due {new Date(job.deadline*1000).toLocaleDateString()}</span>}
        <button onClick={handle} disabled={applying}
          className="ml-auto flex items-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-gray-100 text-black text-xs font-bold transition-all hover:scale-105 disabled:opacity-50">
          {applying ? <span className="w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin"/> : "Apply →"}
        </button>
      </div>
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function FreelancerDashboard() {
  const navigate  = useNavigate();
  const { wallet, runTx } = useGig();
  const userId    = localStorage.getItem("userId");
  const token     = localStorage.getItem("token");

  const [srtBal,    setSrtBal]    = useState("0");
  const [myJobs,    setMyJobs]    = useState([]);
  const [openJobs,  setOpenJobs]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [tab,       setTab]       = useState("active"); // active | completed | browse
  const [user,      setUser]      = useState(null);
  const [heroBannerLoaded, setHeroBannerLoaded] = useState(false);

  // Stats derived from jobs
  const activeJobs    = myJobs.filter(j => ["ASSIGNED","PROOF_SUBMITTED","DISPUTED_AI","DISPUTED_KLEROS","DISPUTED_HUMAN"].includes(j.status));
  const completedJobs = myJobs.filter(j => j.status === "COMPLETED");
  const pendingSRT    = activeJobs.reduce((s,j) => s + parseFloat(j.amount||0), 0);
  const earnedSRT     = completedJobs.reduce((s,j) => s + parseFloat(j.amount||0), 0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // User profile
      if (userId) {
        const r = await fetch(`${BACKEND}/api/users/${userId}`, { headers: { Authorization: `Bearer ${token}` }});
        if (r.ok) setUser(await r.json());
      }

      // SRT Balance
      if (wallet.signer && wallet.address) {
        const t = new ethers.Contract(TOKEN_ADDR, TOKEN_ABI, wallet.signer);
        const [raw, dec] = await Promise.all([t.balanceOf(wallet.address), t.decimals()]);
        setSrtBal(ethers.formatUnits(raw, dec));
      }

      // My assigned jobs from backend
      const myRes  = await fetch(`${BACKEND}/api/jobs/freelancer/${userId}`, { headers: { Authorization: `Bearer ${token}` }});
      const myData = await myRes.json();
      const jobs   = Array.isArray(myData) ? myData : [];

      // Use read-only provider to avoid MetaMask noise on missing gigs
      const escrow = new ethers.Contract(ESCROW_ADDR, ESCROW_ABI, readProvider);
      const enriched = (await Promise.all(jobs.map(async j => {
        try {
          const c = await escrow.getGig(j._id);
          return { ...j, gigId: c.gigId, gigNumber: Number(c.gigNumber), amount: ethers.formatEther(c.amount), status: STATUS_MAP[Number(c.status)] || j.status };
        } catch { return null; } // not on-chain — skip
      }))).filter(Boolean);
      setMyJobs(enriched);

      // Open jobs for browse tab
      const openRes  = await fetch(`${BACKEND}/api/jobs/available`);
      const openData = await openRes.json();
      setOpenJobs(Array.isArray(openData) ? openData : []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [userId, token, wallet.signer, wallet.address]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleApply = async (job) => {
    if (!wallet.address) { pushToast("Connect your wallet first","warning"); return; }
    if (!wallet.signer)  { pushToast("Connect your wallet first","warning"); return; }

    try {
      // 1. Accept on-chain — transitions OPEN → ASSIGNED in the smart contract
      const receipt = await runTx(() => {
        const esc = new ethers.Contract(ESCROW_ADDR, ESCROW_ABI, wallet.signer);
        return esc.acceptGig(job._id);
      }, "Accepting gig on-chain...");

      if (!receipt) return; // runTx shows error toast internally

      // 2. Sync to backend after on-chain confirmation
      const res = await fetch(`${BACKEND}/api/jobs/${job._id}/accept`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          freelancerId:     userId,
          freelancerWallet: wallet.address,
          txHash:           receipt.hash,
        }),
      });

      if (res.ok) {
        pushToast("✅ Gig accepted! Check your Active tab.", "success", 6000);
        fetchData();
      } else {
        // On-chain succeeded but DB sync failed — non-fatal, just warn
        pushToast("✅ On-chain accepted, but DB sync failed. Refresh to see update.", "warning");
      }
    } catch(e) { pushToast(e.message, "error"); }
  };

  const handleDispute = async (gigId) => {
    const r = await runTx(() => {
      const e = new ethers.Contract(ESCROW_ADDR, ESCROW_ABI, wallet.signer);
      return e.raiseDisputeAI(gigId);
    }, "Raising dispute (AI Tier 1)...");
    if (r) {
      await fetch(`${BACKEND}/api/jobs/${gigId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: "DISPUTED_AI", txHash: r.hash }),
      }).catch(() => {});
      // Trigger AI resolution pipeline and notify when done
      fetch(`${BACKEND}/api/dispute/${gigId}/ai-trigger`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      }).then(r => r.json()).then(d => {
        if (d.ruling) pushToast(`🤖 AI Verdict: ${d.ruling} (${Math.round((d.confidence||0)*100)}% confidence)`, "success", 10000);
        else if (d.error) pushToast(`❌ AI failed: ${d.error}`, "error", 10000);
      }).catch(e => pushToast(`❌ AI trigger failed: ${e.message}`, "error", 8000));
      pushToast("🤖 AI is now reviewing your dispute", "info", 6000);
      fetchData();
    }
  };

  const displayJobs = tab === "active" ? activeJobs : tab === "completed" ? completedJobs : openJobs;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-white/4 rounded-full blur-3xl animate-pulse"/>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-white/3 rounded-full blur-3xl animate-pulse" style={{animationDelay:"2s"}}/>
      </div>

      <Navbar />

      <div className="relative z-10 max-w-7xl mx-auto px-4 pt-6 pb-16">
        {/* ── HERO BANNER ─────────────────────────────────────────────────── */}
        <div className="relative rounded-3xl overflow-hidden mb-8 border border-white/8">
          {/* Image */}
          <div className={`transition-opacity duration-700 ${heroBannerLoaded ? "opacity-100" : "opacity-0"}`}>
            <img src={freelancerImg} alt="Freelancer workspace" className="w-full h-52 sm:h-64 object-cover"
              onLoad={() => setHeroBannerLoaded(true)} />
          </div>
          {!heroBannerLoaded && <div className="w-full h-52 sm:h-64 bg-white/4 animate-pulse"/>}

          {/* Overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-transparent"/>

          {/* Text */}
          <div className="absolute inset-0 flex flex-col justify-center px-8">
            <p className="text-white/70 text-xs font-bold tracking-widest uppercase mb-2">👷 Worker Dashboard</p>
            <h1 className="text-3xl sm:text-4xl font-black mb-2">
              Welcome back,{" "}
              <span className="bg-gradient-to-r text-white/50">
                {user?.firstName || "Freelancer"}
              </span>
            </h1>
            <p className="text-white/50 text-sm max-w-lg">Track your gigs, submit work, and get paid in SRT — all secured by smart contracts.</p>
          </div>
        </div>

        {/* ── STAT CARDS ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label:"SRT Balance",    val:parseFloat(srtBal).toFixed(2), icon:"💎", color:"gray",  suffix:" SRT" },
            { label:"Pending Income", val:pendingSRT.toFixed(2),          icon:"⏳", color:"amber",   suffix:" SRT" },
            { label:"Total Earned",   val:earnedSRT.toFixed(2),           icon:"💰", color:"emerald", suffix:" SRT" },
            { label:"Active Gigs",    val:activeJobs.length,              icon:"🔄", color:"gray",    suffix:"" },
          ].map(({label,val,icon,color,suffix},i) => (
            <StatCard key={i} label={label} val={val} icon={icon} color={color} suffix={suffix} delay={i*100} />
          ))}
        </div>

        {/* ── TABS ────────────────────────────────────────────────────────── */}
        <div className="flex gap-2 mb-6 bg-white/4 border border-white/8 rounded-2xl p-1.5 w-fit">
          {[["active","🔄 Active"], ["completed","✅ Completed"], ["browse","🌐 Browse Jobs"]].map(([v,l]) => (
            <button key={v} onClick={() => setTab(v)}
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200
                ${tab===v ? "bg-white text-black shadow-lg" : "text-white/40 hover:text-white"}`}>
              {l}
            </button>
          ))}
        </div>

        {/* ── CONTENT ─────────────────────────────────────────────────────── */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1,2,3,4].map(i => <SkeletonGigCard key={i}/>)}
          </div>
        ) : displayJobs.length === 0 ? (
          <EmptyState tab={tab} onBrowse={() => setTab("browse")} onNavigate={navigate} />
        ) : tab === "browse" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {openJobs.map((j,i) => <BrowseCard key={j._id} job={j} onApply={handleApply} idx={i}/>)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {displayJobs.map((j,i) => (
              <JobCard key={j.gigId||j._id} job={j} idx={i}
                onSubmit={() => navigate("/work-submission", { state:{ gigId:j.gigId||j._id } })}
                onDispute={handleDispute}
                onView={(id) => navigate(`/ResolutionCenter?gig=${id}`)}/>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, val, icon, color, suffix, delay }) {
  const [ref, vis] = useFade(delay);
  const colorMap = {
    gray:   "border-white/10 bg-white/5 text-white",
    amber:  "border-white/10 bg-white/5 text-white",
    emerald:"border-white/10 bg-white/5 text-white",
  };
  return (
    <div ref={ref} style={{ transitionDelay:`${delay}ms` }}
      className={`rounded-2xl border p-5 transition-all duration-700 hover:scale-[1.02] ${colorMap[color] || "border-white/10 bg-white/5"}
        ${vis ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
      <p className="text-2xl mb-2">{icon}</p>
      <p className="text-white font-black text-2xl"><Counter target={parseFloat(val)} />{suffix}</p>
      <p className="text-white/40 text-xs mt-1">{label}</p>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState({ tab, onBrowse, onNavigate }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/4 p-14 text-center">
      <p className="text-6xl mb-4 opacity-40">{tab==="browse" ? "🔍" : "📭"}</p>
      <p className="text-white/60 text-base font-semibold mb-2">
        {tab==="active" ? "No active gigs right now" : tab==="completed" ? "No completed gigs yet" : "No open jobs available"}
      </p>
      <p className="text-white/30 text-sm mb-6">
        {tab==="active" ? "Browse the job board to find your next project" : "Keep working — your first payout is close!"}
      </p>
      <button onClick={tab==="active" ? onBrowse : () => onNavigate("/")}
        className="px-6 py-3 rounded-xl bg-white text-black font-semibold text-sm hover:scale-105 transition-all shadow-lg">
        {tab==="active" ? "Browse Open Jobs →" : "Back to Home →"}
      </button>
    </div>
  );
}
