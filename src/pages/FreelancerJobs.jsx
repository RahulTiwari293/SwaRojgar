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
const ESCROW_ABI  = [
  "function acceptGig(string gigId) external",
  "function raiseDisputeAI(string gigId) external",
  "function getGig(string gigId) view returns (tuple(string gigId, uint256 gigNumber, address client, address freelancer, uint256 amount, uint8 status, uint256 createdAt, uint256 deadline, string proofIpfsHash, string metaEvidenceUri, string aiProposalUri, bool clientAcceptsAI, bool freelancerAcceptsAI, uint256 metaEvidenceID, uint256 klerosDisputeId, bool hasKlerosDispute, uint256 klerosRuling))",
];
const TOKEN_ABI   = ["function balanceOf(address) view returns(uint256)", "function decimals() view returns(uint8)"];
const ESCROW_ADDR = (import.meta.env.VITE_ESCROW_CONTRACT_ADDRESS || "0x8eFa974E68A449B25Db77B73841dc14921A98Ba5").trim();
const TOKEN_ADDR  = (import.meta.env.VITE_TOKEN_CONTRACT_ADDRESS  || "0x5D3976fc3F92174da8F851a12a5b0056CC6783A0").trim();

const STATUS_MAP = {0:"OPEN",1:"ASSIGNED",2:"PROOF_SUBMITTED",3:"DISPUTED_AI",4:"DISPUTED_KLEROS",5:"DISPUTED_HUMAN",6:"COMPLETED",7:"REFUNDED"};

const STATUS_META = {
  OPEN:            { label:"Open",             rail:"bg-grad-success", pill:"bg-[var(--success-bg)] text-success border-success/30",          dot:"bg-success" },
  ASSIGNED:        { label:"Assigned",         rail:"bg-escrow",       pill:"bg-[var(--info-bg)] text-info border-info/30",                   dot:"bg-info" },
  PROOF_SUBMITTED: { label:"In Review",        rail:"bg-gold",         pill:"bg-primary/10 text-primary border-primary/30",                  dot:"bg-primary" },
  DISPUTED_AI:     { label:"Disputed · AI",    rail:"bg-grad-danger",  pill:"bg-[var(--destructive-bg)] text-destructive border-destructive/30", dot:"bg-destructive" },
  DISPUTED_KLEROS: { label:"Disputed · Kleros",rail:"bg-grad-danger",  pill:"bg-[var(--destructive-bg)] text-destructive border-destructive/30", dot:"bg-destructive" },
  DISPUTED_HUMAN:  { label:"Disputed · Admin", rail:"bg-grad-danger",  pill:"bg-[var(--destructive-bg)] text-destructive border-destructive/30", dot:"bg-destructive" },
  COMPLETED:       { label:"Completed",        rail:"bg-muted-foreground", pill:"bg-surface-2 text-muted-foreground border-hairline",        dot:"bg-muted-foreground" },
  REFUNDED:        { label:"Refunded",         rail:"bg-surface-2",    pill:"bg-surface-2 text-muted-foreground border-hairline",            dot:"bg-muted-foreground" },
};

// ─── Hooks ────────────────────────────────────────────────────────────────────
function useFade(delay = 0) {
  const ref = useRef(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVis(true); obs.disconnect(); } }, { threshold: 0.08 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return [ref, vis];
}

function Counter({ target, suffix = "" }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    const n = parseFloat(target)||0; let s=0; const step=n/40;
    const t = setInterval(()=>{ s+=step; if(s>=n){setVal(n);clearInterval(t);}else setVal(s);},30);
    return ()=>clearInterval(t);
  },[target]);
  return <span>{val.toFixed(2)}{suffix}</span>;
}

// ─── Status Pill ─────────────────────────────��──────────────────────────���─────
function StatusPill({ s }) {
  const m = STATUS_META[s] || STATUS_META.OPEN;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider ${m.pill}`}>
      <span className={`h-1.5 w-1.5 rounded-full animate-pulse-dot ${m.dot}`} />
      {m.label}
    </span>
  );
}

// ─── GigId Row ────────────────────────────────────────────────────────────────
function GigIdRow({ id }) {
  const [copied, setCopied] = useState(false);
  const copy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id||"").then(()=>{ setCopied(true); setTimeout(()=>setCopied(false),1500); });
  };
  return (
    <div className="flex items-center gap-1.5 mt-1">
      <p className="font-mono-tab text-[11px] text-muted-foreground break-all leading-tight">{id}</p>
      <button onClick={copy} className="shrink-0 text-muted-foreground/50 hover:text-muted-foreground transition-colors text-[11px]">
        {copied ? "✓" : "⧉"}
      </button>
    </div>
  );
}

// ─── Job Card ────────────────────────────��────────────────────────────────────
function JobCard({ job, onSubmit, onDispute, onView, idx }) {
  const [ref, vis] = useFade(idx*80);
  const settled    = ["COMPLETED","REFUNDED"].includes(job.status);
  const canSubmit  = job.status === "ASSIGNED";
  const canDispute = job.status === "PROOF_SUBMITTED";
  const meta       = STATUS_META[job.status] || STATUS_META.OPEN;

  return (
    <article ref={ref} style={{transitionDelay:`${idx*80}ms`}}
      className={`group shadow-card relative overflow-hidden rounded-2xl border border-hairline bg-surface
        transition-all duration-500 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-glow
        ${vis ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>

      <div className={`absolute inset-y-0 left-0 w-1 ${meta.rail}`} />

      <div className="p-5 pl-7">
        <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              {job.gigNumber && (
                <span className="font-mono-tab rounded-md bg-surface-2 px-2 py-0.5 text-[11px] text-muted-foreground">
                  GIG #{job.gigNumber}
                </span>
              )}
              <StatusPill s={job.status} />
            </div>
            <h3 className="text-display text-base font-semibold text-foreground">{job.title || "Untitled Gig"}</h3>
            <GigIdRow id={job.gigId||job._id} />
          </div>
          <div className="rounded-xl border border-hairline bg-background/40 px-4 py-2.5 text-right shrink-0">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">
              {settled ? "Released" : "Locked"}
            </p>
            <p className="text-display text-xl font-semibold text-foreground">
              {parseFloat(job.amount||0).toFixed(1)}
              <span className="text-sm text-muted-foreground ml-1">SRT</span>
            </p>
          </div>
        </div>

        {job.content && <p className="text-muted-foreground text-xs mb-3 line-clamp-2">{job.content}</p>}

        {/* Status strips */}
        {!settled && (
          <div className="flex items-center gap-2 mb-3 py-1.5 px-3 rounded-lg bg-surface-2 border border-hairline">
            <span className="text-xs">🔒</span>
            <span className="text-muted-foreground text-xs">{parseFloat(job.amount||0).toFixed(2)} SRT locked in escrow</span>
          </div>
        )}
        {job.status === "COMPLETED" && (
          <div className="flex items-center gap-2 mb-3 py-1.5 px-3 rounded-lg bg-[var(--success-bg)] border border-success/20">
            <span className="text-xs">🎉</span>
            <span className="text-success text-xs font-semibold">{parseFloat(job.amount||0).toFixed(2)} SRT paid to your wallet!</span>
          </div>
        )}
        {job.status === "DISPUTED_AI" && (
          <div className="flex items-center gap-2 mb-3 py-1.5 px-3 rounded-lg bg-[var(--warning-bg)] border border-warning/20">
            <span className="text-xs">🤖</span>
            <span className="text-warning text-xs font-semibold">AI is reviewing this dispute</span>
          </div>
        )}
        {job.status === "DISPUTED_KLEROS" && (
          <div className="flex items-center gap-2 mb-3 py-1.5 px-3 rounded-lg bg-[var(--destructive-bg)] border border-destructive/20">
            <span className="text-xs">⚖️</span>
            <span className="text-destructive text-xs font-semibold">Kleros jurors are voting on this case</span>
          </div>
        )}
        {job.status === "DISPUTED_HUMAN" && (
          <div className="flex items-center gap-2 mb-3 py-1.5 px-3 rounded-lg bg-primary/10 border border-primary/20">
            <span className="text-xs">👤</span>
            <span className="text-primary text-xs font-semibold">Awaiting human admin arbitration</span>
          </div>
        )}

        <div className="h-px bg-hairline mb-3" />

        <div className="flex gap-2 flex-wrap">
          {canSubmit && (
            <button onClick={() => onSubmit(job)}
              className="bg-gold inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold text-white shadow-glow hover:opacity-90 transition-all hover:scale-105">
              📤 Submit Work
            </button>
          )}
          {canDispute && (
            <button onClick={() => onDispute(job.gigId||job._id)}
              className="bg-grad-danger inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold text-white transition-all hover:scale-105">
              ⚠️ Raise Dispute
            </button>
          )}
          <button onClick={() => onView(job.gigId||job._id)}
            className="glass inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-all">
            ⚖️ Resolution
          </button>
        </div>
      </div>
    </article>
  );
}

// ─── Browse Card ─────────────────────────────���────────────────────────────────
function BrowseCard({ job, onApply, idx }) {
  const [ref, vis] = useFade(idx*60);
  const [applying, setApplying] = useState(false);
  const handle = async () => { setApplying(true); await onApply(job); setApplying(false); };
  return (
    <div ref={ref} style={{transitionDelay:`${idx*60}ms`}}
      className={`shadow-card group rounded-2xl border border-hairline bg-surface hover:border-primary/30 p-5 transition-all duration-500 hover:-translate-y-0.5 hover:shadow-glow
        ${vis ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
      <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
        <div className="min-w-0">
          <h3 className="text-foreground font-semibold text-sm truncate">{job.title}</h3>
          <p className="text-muted-foreground text-xs mt-0.5">
            Posted by {job.userId?.firstName} {job.userId?.lastName}
          </p>
        </div>
        <span className="text-display text-foreground font-semibold text-base shrink-0">{job.srtAmount} SRT</span>
      </div>
      <p className="text-muted-foreground text-xs mb-3 line-clamp-2">{job.content}</p>
      <div className="flex items-center justify-between">
        {job.deadline && <span className="text-muted-foreground text-xs">📅 {new Date(job.deadline*1000).toLocaleDateString()}</span>}
        <button onClick={handle} disabled={applying}
          className="ml-auto bg-gold inline-flex items-center gap-2 px-4 py-2 rounded-full text-white text-xs font-semibold shadow-glow hover:opacity-90 transition-all disabled:opacity-50">
          {applying ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"/> : "Apply →"}
        </button>
      </div>
    </div>
  );
}

// ─── Stat Card ──────────────────���────────────────────────────���────────────────
function StatCard({ label, val, icon, suffix, delay, tone }) {
  const [ref, vis] = useFade(delay);
  const iconCls = tone === "primary" ? "bg-primary/15 text-primary"
    : tone === "success" ? "bg-[var(--success-bg)] text-success"
    : tone === "warning" ? "bg-[var(--warning-bg)] text-warning"
    : "bg-surface-2 text-muted-foreground";
  return (
    <div ref={ref} style={{transitionDelay:`${delay}ms`}}
      className={`shadow-card grain rounded-2xl border border-hairline bg-surface p-5 transition-all duration-700 hover:-translate-y-0.5 hover:border-primary/30
        ${vis ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-4 ${iconCls}`}>{icon}</div>
      <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">{label}</p>
      <p className="text-display text-2xl font-semibold text-foreground"><Counter target={parseFloat(val)}/>{suffix}</p>
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function FreelancerDashboard() {
  const navigate  = useNavigate();
  const { wallet, runTx } = useGig();
  const userId    = localStorage.getItem("userId");
  const token     = localStorage.getItem("token");

  const [srtBal,  setSrtBal]  = useState("0");
  const [myJobs,  setMyJobs]  = useState([]);
  const [openJobs,setOpenJobs]= useState([]);
  const [loading, setLoading] = useState(true);
  const [tab,     setTab]     = useState("active");
  const [user,    setUser]    = useState(null);
  const [heroLoaded, setHeroLoaded] = useState(false);

  const activeJobs    = myJobs.filter(j => ["ASSIGNED","PROOF_SUBMITTED","DISPUTED_AI","DISPUTED_KLEROS","DISPUTED_HUMAN"].includes(j.status));
  const completedJobs = myJobs.filter(j => j.status === "COMPLETED");
  const pendingSRT    = activeJobs.reduce((s,j) => s + parseFloat(j.amount||0), 0);
  const earnedSRT     = completedJobs.reduce((s,j) => s + parseFloat(j.amount||0), 0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      if (userId) {
        const r = await fetch(`${BACKEND}/api/users/${userId}`, { headers: { Authorization: `Bearer ${token}` } });
        if (r.ok) setUser(await r.json());
      }
      if (wallet.signer && wallet.address) {
        const t = new ethers.Contract(TOKEN_ADDR, TOKEN_ABI, wallet.signer);
        const [raw, dec] = await Promise.all([t.balanceOf(wallet.address), t.decimals()]);
        setSrtBal(ethers.formatUnits(raw, dec));
      }
      const myRes = await fetch(`${BACKEND}/api/jobs/freelancer/${userId}`, { headers: { Authorization: `Bearer ${token}` } });
      const myData = await myRes.json();
      const jobs = Array.isArray(myData) ? myData : [];
      const escrow = new ethers.Contract(ESCROW_ADDR, ESCROW_ABI, readProvider);
      const enriched = (await Promise.all(jobs.map(async j => {
        try {
          const c = await escrow.getGig(j._id);
          return { ...j, gigId:c.gigId, gigNumber:Number(c.gigNumber), amount:ethers.formatEther(c.amount), status:STATUS_MAP[Number(c.status)]||j.status };
        } catch { return null; }
      }))).filter(Boolean);
      setMyJobs(enriched);
      const openRes = await fetch(`${BACKEND}/api/jobs/available`);
      const openData = await openRes.json();
      setOpenJobs(Array.isArray(openData) ? openData : []);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  }, [userId, token, wallet.signer, wallet.address]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleApply = async (job) => {
    if (!wallet.address || !wallet.signer) { pushToast("Connect your wallet first","warning"); return; }
    try {
      const receipt = await runTx(() => {
        const esc = new ethers.Contract(ESCROW_ADDR, ESCROW_ABI, wallet.signer);
        return esc.acceptGig(job._id);
      }, "Accepting gig on-chain...");
      if (!receipt) return;
      const res = await fetch(`${BACKEND}/api/jobs/${job._id}/accept`, {
        method:"PATCH", headers:{"Content-Type":"application/json", Authorization:`Bearer ${token}`},
        body: JSON.stringify({ freelancerId:userId, freelancerWallet:wallet.address, txHash:receipt.hash }),
      });
      if (res.ok) { pushToast("✅ Gig accepted! Check your Active tab.", "success", 6000); fetchData(); }
      else pushToast("✅ On-chain accepted, DB sync failed. Refresh.", "warning");
    } catch(e) { pushToast(e.message, "error"); }
  };

  const handleDispute = async (gigId) => {
    const r = await runTx(() => {
      const e = new ethers.Contract(ESCROW_ADDR, ESCROW_ABI, wallet.signer);
      return e.raiseDisputeAI(gigId);
    }, "Raising dispute (AI Tier 1)...");
    if (r) {
      await fetch(`${BACKEND}/api/jobs/${gigId}/status`, {
        method:"PATCH", headers:{"Content-Type":"application/json", Authorization:`Bearer ${token}`},
        body: JSON.stringify({ status:"DISPUTED_AI", txHash:r.hash }),
      }).catch(()=>{});
      fetch(`${BACKEND}/api/dispute/${gigId}/ai-trigger`, {
        method:"POST", headers:{"Content-Type":"application/json", Authorization:`Bearer ${token}`},
      }).then(r=>r.json()).then(d=>{
        if (d.ruling) pushToast(`🤖 AI Verdict: ${d.ruling} (${Math.round((d.confidence||0)*100)}% confidence)`, "success", 10000);
        else if (d.error) pushToast(`❌ AI failed: ${d.error}`, "error", 10000);
      }).catch(e=>pushToast(`❌ AI trigger failed: ${e.message}`, "error", 8000));
      pushToast("🤖 AI is now reviewing your dispute", "info", 6000);
      fetchData();
    }
  };

  const displayJobs = tab === "active" ? activeJobs : tab === "completed" ? completedJobs : openJobs;

  const TABS = [
    { key:"active",    label:"Active",      count:activeJobs.length },
    { key:"completed", label:"Completed",   count:completedJobs.length },
    { key:"browse",    label:"Browse Jobs", count:openJobs.length },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-1/4 left-1/3 w-96 h-96 rounded-full bg-primary/5 blur-3xl animate-float-slow" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-accent/4 blur-3xl" style={{animationDelay:"2s"}} />
      </div>

      <Navbar />

      <main className="relative z-10 max-w-7xl mx-auto px-4 pt-6 pb-20">

        {/* ── HERO ── */}
        <div className="grain relative rounded-3xl overflow-hidden mb-8 border border-hairline shadow-card">
          <div className={`transition-opacity duration-700 ${heroLoaded?"opacity-100":"opacity-0"}`}>
            <img src={freelancerImg} alt="Freelancer workspace" className="w-full h-52 sm:h-64 object-cover"
              onLoad={()=>setHeroLoaded(true)}/>
          </div>
          {!heroLoaded && <div className="w-full h-52 sm:h-64 bg-surface-2 animate-pulse"/>}
          <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/70 to-transparent"/>
          <div className="absolute inset-0 flex flex-col justify-center px-8">
            <p className="text-muted-foreground text-xs font-bold tracking-widest uppercase mb-2">👷 Worker Dashboard</p>
            <h1 className="text-display text-3xl sm:text-4xl font-semibold mb-2 text-foreground">
              Welcome back, <span className="bg-gold bg-clip-text text-transparent">{user?.firstName || "Freelancer"}</span>
            </h1>
            <p className="text-muted-foreground text-sm max-w-lg">Track your gigs, submit work, and get paid in SRT — secured by smart contracts.</p>
          </div>
        </div>

        {/* ── STATS ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard label="SRT Balance"    val={parseFloat(srtBal).toFixed(2)} icon="💎" suffix="" delay={0}   tone="primary" />
          <StatCard label="Pending Income" val={pendingSRT.toFixed(2)}          icon="⏳" suffix="" delay={80}  tone="warning" />
          <StatCard label="Total Earned"   val={earnedSRT.toFixed(2)}           icon="💰" suffix="" delay={160} tone="success" />
          <StatCard label="Active Gigs"    val={activeJobs.length}              icon="🔄" suffix="" delay={240} tone="default" />
        </div>

        {/* ── TABS ── */}
        <div className="glass sticky top-3 z-20 flex gap-1 rounded-2xl p-2 mb-6 shadow-soft w-fit">
          {TABS.map(({ key, label, count }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200
                ${tab===key ? "bg-foreground text-background shadow-soft" : "text-muted-foreground hover:text-foreground hover:bg-surface-2"}`}>
              {label}
              <span className={`font-mono-tab rounded-md px-1.5 py-0.5 text-[10px]
                ${tab===key ? "bg-background/15 text-background" : "bg-surface-2 text-muted-foreground"}`}>
                {count}
              </span>
            </button>
          ))}
        </div>

        {/* ── CONTENT ── */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1,2,3,4].map(i=><SkeletonGigCard key={i}/>)}
          </div>
        ) : displayJobs.length === 0 ? (
          <div className="glass rounded-3xl py-20 text-center border border-hairline">
            <p className="text-5xl mb-4 opacity-30">{tab==="browse"?"🔍":"📭"}</p>
            <h3 className="text-foreground text-lg font-semibold mb-2">
              {tab==="active" ? "No active gigs right now" : tab==="completed" ? "No completed gigs yet" : "No open jobs available"}
            </h3>
            <p className="text-muted-foreground text-sm mb-6">
              {tab==="active" ? "Browse the job board to find your next project" : "Keep going — your first payout is close!"}
            </p>
            <button onClick={() => setTab(tab==="active" ? "browse" : "active")}
              className="bg-gold inline-flex items-center gap-2 px-6 py-3 rounded-full text-white font-semibold text-sm shadow-glow hover:opacity-90 transition-all">
              {tab==="active" ? "Browse Open Jobs →" : "Back to Active →"}
            </button>
          </div>
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
      </main>
    </div>
  );
}
