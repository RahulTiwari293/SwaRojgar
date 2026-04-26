/**
 * CustomerJobs.jsx — Client (Buyer) Dashboard
 *
 * Sections:
 *  - Animated hero banner with client image
 *  - Live SRT stats (spent, locked, active gigs)
 *  - My posted gigs with Approve / Release / Dispute actions
 *  - Create new gig modal (posts to backend + locks SRT)
 *  - Proof review panel (view IPFS proof before approving)
 *  - All buttons wired to live contract + backend
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import { ethers } from "ethers";
import { useNavigate } from "react-router-dom";
import { useGig, pushToast } from "../context/GigContext";
import { SkeletonGigCard } from "../components/Skeleton";
import Navbar from "../navbar";
import clientImg from "../assets/client_dashboard_hero.png";

const BACKEND     = import.meta.env.VITE_BACKEND_URL || "http://localhost:5010";
const ESCROW_ADDR = (import.meta.env.VITE_ESCROW_CONTRACT_ADDRESS || "0x8eFa974E68A449B25Db77B73841dc14921A98Ba5").trim();
const TOKEN_ADDR  = (import.meta.env.VITE_TOKEN_CONTRACT_ADDRESS  || "0x5D3976fc3F92174da8F851a12a5b0056CC6783A0").trim();
const RPC_URL     = import.meta.env.VITE_RPC_URL || "https://rpc.sepolia.org";
// Read-only provider — avoids MetaMask popup for failed view calls
const readProvider = new ethers.JsonRpcProvider(RPC_URL);

const TOKEN_ABI = [
  "function balanceOf(address) view returns(uint256)",
  "function decimals() view returns(uint8)",
  "function approve(address spender, uint256 amount) returns(bool)",
];
const ESCROW_ABI = [
  "function createGig(string gigId, uint256 amount, uint256 deadline, string metaEvidenceUri) external",
  "function approveWork(string gigId) external",
  "function raiseDisputeAI(string gigId) external",
  "function getGig(string gigId) view returns (tuple(string gigId, uint256 gigNumber, address client, address freelancer, uint256 amount, uint8 status, uint256 createdAt, uint256 deadline, string proofIpfsHash, string metaEvidenceUri, string aiProposalUri, bool clientAcceptsAI, bool freelancerAcceptsAI, uint256 metaEvidenceID, uint256 klerosDisputeId, bool hasKlerosDispute, uint256 klerosRuling))",
];

const STATUS_MAP = {0:"OPEN",1:"ASSIGNED",2:"PROOF_SUBMITTED",3:"DISPUTED_AI",4:"DISPUTED_KLEROS",5:"DISPUTED_HUMAN",6:"COMPLETED",7:"REFUNDED"};
const STATUS_STYLE = {
  OPEN:            "bg-white/10 border-white/20 text-white/80",
  ASSIGNED:        "bg-white/15 border-white/25 text-white",
  PROOF_SUBMITTED: "bg-white/20 border-white/30 text-white font-bold",
  COMPLETED:       "bg-white/10 border-white/15 text-white/60",
  DISPUTED_AI:     "bg-white/8 border-white/15 text-white/70",
  DISPUTED_KLEROS: "bg-white/8 border-white/15 text-white/70",
  DISPUTED_HUMAN:  "bg-white/8 border-white/15 text-white/70",
  REFUNDED:        "bg-white/5 border-white/10 text-white/40",
};

// ─── Hooks & helpers ──────────────────────────────────────────────────────────
function useFade(delay = 0) {
  const ref = useRef(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVis(true); obs.disconnect(); }}, { threshold: 0.08 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return [ref, vis, delay];
}

function Counter({ target }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    const n = parseFloat(target)||0; let cur=0; const s=n/40;
    const t = setInterval(()=>{ cur+=s; if(cur>=n){setV(n);clearInterval(t);}else setV(cur);},30);
    return ()=>clearInterval(t);
  },[target]);
  return <span>{v.toFixed(2)}</span>;
}

function StatusBadge({ s }) {
  return <span className={`px-2.5 py-1 text-xs font-bold rounded-full border ${STATUS_STYLE[s]||STATUS_STYLE.OPEN}`}>{s?.replace(/_/g," ")}</span>;
}

// ─── Gig Card ─────────────────────────────────────────────────────────────────
function GigCard({ gig, onApprove, onDispute, onView, idx }) {
  const [ref, vis] = useFade(idx*80);
  const [showProof, setShowProof] = useState(false);
  const isSettled  = ["COMPLETED","REFUNDED"].includes(gig.status);
  const hasProof   = Boolean(gig.proofIpfsHash);
  const canApprove = gig.status === "PROOF_SUBMITTED";
  const canDispute = gig.status === "PROOF_SUBMITTED";

  return (
    <div ref={ref} style={{transitionDelay:`${idx*80}ms`}}
      className={`group rounded-2xl border border-white/8 bg-white/4 hover:bg-white/6 hover:border-white/20 backdrop-blur-sm p-5 transition-all duration-500 hover:scale-[1.01] hover:shadow-xl hover:shadow-black/20
        ${vis?"opacity-100 translate-y-0":"opacity-0 translate-y-6"}`}>

      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
        <div>
          {gig.gigNumber && <p className="text-white/60 text-xs font-bold mb-1">Gig #{gig.gigNumber}</p>}
          <h3 className="text-white font-semibold text-base group-hover:text-white transition-colors">{gig.title || "Untitled"}</h3>
          <p className="text-white/35 text-xs font-mono mt-0.5">{(gig.gigId||gig._id)?.slice(0,22)}...</p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <StatusBadge s={gig.status}/>
          <span className="text-white/60 font-bold text-lg">{gig.amount||gig.srtAmount} SRT</span>
        </div>
      </div>

      {gig.content && <p className="text-white/35 text-xs mb-3 line-clamp-2">{gig.content}</p>}

      {/* Assignee */}
      {gig.assignedFreelancer && (
        <div className="flex items-center gap-2 mb-3 p-2.5 rounded-xl bg-white/4 border border-white/6">
          <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold text-white">
            {gig.assignedFreelancer?.firstName?.[0] || "F"}
          </div>
          <div>
            <p className="text-white/70 text-xs font-semibold">
              {gig.assignedFreelancer?.firstName} {gig.assignedFreelancer?.lastName}
            </p>
            <p className="text-white/30 text-[10px]">Assigned freelancer</p>
          </div>
        </div>
      )}

      {/* Locked indicator */}
      {!isSettled && (
        <div className="flex items-center gap-2 mb-3 py-1.5 px-3 rounded-lg bg-white/4 border border-white/15">
          <span className="text-white/70 text-xs">🔒</span>
          <span className="text-white/50 text-xs">{gig.amount||gig.srtAmount} SRT locked in escrow</span>
        </div>
      )}
      {gig.status === "COMPLETED" && (
        <div className="flex items-center gap-2 mb-3 py-1.5 px-3 rounded-lg bg-white/6 border border-white/15">
          <span className="text-xs">✅</span>
          <span className="text-white/70 text-xs font-semibold">Payment released to freelancer</span>
        </div>
      )}

      {/* Proof viewer */}
      {hasProof && (
        <div className="mb-3">
          <button onClick={() => setShowProof(v=>!v)}
            className="flex items-center gap-2 text-white/60 hover:text-white text-xs font-semibold transition-colors">
            📎 {showProof ? "Hide" : "View"} submitted proof
            <span className={`transition-transform duration-200 ${showProof?"-rotate-90":"rotate-0"}`}>▶</span>
          </button>
          {showProof && (
            <div className="mt-2 p-3 rounded-xl bg-white/6 border border-white/15">
              <p className="text-white/50 text-xs mb-2">IPFS proof hash:</p>
              <a href={`https://gateway.pinata.cloud/${gig.proofIpfsHash}`} target="_blank" rel="noopener noreferrer"
                className="text-white/60 text-xs font-mono break-all hover:underline">
                {gig.proofIpfsHash}
              </a>
              <p className="text-white/30 text-[10px] mt-1">{gig.proofDescription}</p>
            </div>
          )}
        </div>
      )}

      {/* Divider */}
      <div className="h-px bg-white/5 mb-3"/>

      {/* Actions */}
      <div className="flex gap-2 flex-wrap">
        {canApprove && (
          <button onClick={() => onApprove(gig.gigId||gig._id)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-gray-100 text-black text-xs font-bold transition-all hover:scale-105 shadow-lg">
            ✅ Approve & Release SRT
          </button>
        )}
        {canDispute && (
          <button onClick={() => onDispute(gig.gigId||gig._id)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-600/70 hover:bg-orange-500 text-white text-xs font-bold transition-all hover:scale-105">
            ⚠️ Raise Dispute
          </button>
        )}
        <button onClick={() => onView(gig.gigId||gig._id)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/6 hover:bg-white/10 text-white/50 hover:text-white text-xs font-semibold transition-all border border-white/8">
          ⚖️ Resolution
        </button>
      </div>
    </div>
  );
}

// ─── Create Gig Modal ─────────────────────────────────────────────────────────
function CreateGigModal({ onClose, onCreated, srtBalance, user }) {
  const { wallet, runTx } = useGig();
  const userId = localStorage.getItem("userId");
  const token  = localStorage.getItem("token");
  const [form, setForm] = useState({ title:"", content:"", srtAmount:"", deadline:"" });
  const [step, setStep]  = useState(1); // 1=details, 2=locking
  const [saving, setSaving] = useState(false);
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const handleCreate = async () => {
    if (!form.title || !form.content || !form.srtAmount) {
      pushToast("Please fill in all required fields","warning"); return;
    }
    if (!wallet.signer) { pushToast("Connect your wallet first","warning"); return; }
    if (parseFloat(form.srtAmount) > parseFloat(srtBalance)) {
      pushToast(`Insufficient SRT balance (${srtBalance} SRT)`,"error"); return;
    }
    setSaving(true); setStep(2);
    try {
      // 1. Save to backend
      const res  = await fetch(`${BACKEND}/api/posts`, {
        method:"POST", headers:{"Content-Type":"application/json", Authorization:`Bearer ${token}`},
        body: JSON.stringify({ userId, title:form.title, content:form.content, userType:"client", postType:"job",
          srtAmount: parseFloat(form.srtAmount), deadline: form.deadline ? Math.floor(new Date(form.deadline)/1000) : Math.floor(Date.now()/1000) + 30*24*60*60,
          walletAddress: wallet.address })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      const gigId = data.post._id;

      // 2. Upload MetaEvidence to IPFS (required by ERC-1497 and by the smart contract)
      pushToast("Step 1/3 — Uploading gig context to IPFS...","loading",20000);
      const metaRes = await fetch(`${BACKEND}/api/dispute/upload-meta`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          gigId,
          title:       form.title,
          description: form.content,
          budget:      form.srtAmount,
          deadline:    form.deadline || null,
          clientName:  user ? `${user.firstName} ${user.lastName}` : "Client",
        }),
      });
      if (!metaRes.ok) {
        const errData = await metaRes.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to upload MetaEvidence to IPFS — check Pinata credentials in backend .env");
      }
      const { metaEvidenceUri } = await metaRes.json();
      pushToast("✅ MetaEvidence uploaded","success");

      // 3. Approve token spend
      pushToast("Step 2/3 — Approve SRT spend in MetaMask...","loading",20000);
      const tokenC  = new ethers.Contract(TOKEN_ADDR, TOKEN_ABI, wallet.signer);
      const dec     = await tokenC.decimals();
      const rawAmt  = ethers.parseUnits(form.srtAmount, dec);
      const approTx = await tokenC.approve(ESCROW_ADDR, rawAmt);
      await approTx.wait();
      pushToast("✅ Approval done","success");

      // 4. Lock in escrow
      const receipt = await runTx(() => {
        const esc = new ethers.Contract(ESCROW_ADDR, ESCROW_ABI, wallet.signer);
        // Default to 30 days from now if no deadline set (contract requires deadline > block.timestamp)
        const dl  = form.deadline ? Math.floor(new Date(form.deadline)/1000) : Math.floor(Date.now()/1000) + 30*24*60*60;
        return esc.createGig(gigId, rawAmt, dl, metaEvidenceUri);
      }, "Locking SRT in escrow...");

      if (receipt) {
        // Sync blockchain tx hash back to MongoDB post
        await fetch(`${BACKEND}/api/jobs/${gigId}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ status: "OPEN", txHash: receipt.hash }),
        }).catch(() => {}); // non-fatal

        pushToast(`🔒 ${form.srtAmount} SRT locked! Gig #${data.post.gigNumber || "—"} is live.`,"success",6000);
        onCreated();
        onClose();
      } else {
        // runTx returned null — tx failed or was rejected
        setStep(1);
      }
    } catch(e) { pushToast(e.reason||e.message,"error"); setStep(1); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose}/>
      <div className="relative w-full max-w-lg rounded-3xl border border-white/10 bg-gray-950/95 backdrop-blur-xl p-7 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-white font-black text-xl">➕ Post a New Gig</h2>
            <p className="text-white/40 text-xs mt-0.5">Funds lock automatically when you submit</p>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white text-2xl transition-colors leading-none">✕</button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2">
          {[1,2,3].map(s => (
            <React.Fragment key={s}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all
                ${step >= s ? "bg-white text-black" : "bg-white/8 text-white/30"}`}>{s}</div>
              {s<3 && <div className={`flex-1 h-0.5 rounded transition-all ${step>s ? "bg-white" : "bg-white/10"}`}/>}
            </React.Fragment>
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <Field label="Gig Title *" value={form.title} onChange={v=>set("title",v)} placeholder="e.g. Build a React dashboard" />
            <div>
              <label className="text-white/50 text-xs mb-1.5 block">Description *</label>
              <textarea value={form.content} onChange={e=>set("content",e.target.value)} rows={3}
                placeholder="Describe the work in detail..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 focus:outline-none focus:border-white/40 resize-none transition-colors"/>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-white/50 text-xs mb-1.5 block">SRT Amount *</label>
                <input type="number" value={form.srtAmount} onChange={e=>set("srtAmount",e.target.value)} placeholder="e.g. 100"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-white/40 transition-colors"/>
                <p className="text-white/25 text-[10px] mt-1">Balance: {parseFloat(srtBalance||"0").toFixed(2)} SRT</p>
              </div>
              <div>
                <label className="text-white/50 text-xs mb-1.5 block">Deadline (optional)</label>
                <input type="date" value={form.deadline} onChange={e=>set("deadline",e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white/80 focus:outline-none focus:border-white/40 transition-colors"/>
              </div>
            </div>

            <div className="bg-white/4 border border-white/15 rounded-xl p-3 text-xs text-white/60">
              <strong>3 steps:</strong> Upload gig context to IPFS, approve SRT spend, then lock tokens in escrow. Funds release only on your approval.
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col items-center py-6 gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-white to-gray-200 flex items-center justify-center text-3xl animate-pulse">🔒</div>
            <p className="text-white font-bold">Locking SRT in escrow...</p>
            <p className="text-white/40 text-sm text-center">Check MetaMask for confirmation prompts. Don't close this window.</p>
          </div>
        )}

        {step === 1 && (
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-3 rounded-xl bg-white/6 hover:bg-white/10 text-white/60 font-semibold text-sm transition-all border border-white/8">Cancel</button>
            <button onClick={handleCreate} disabled={saving}
              className="flex-1 py-3 rounded-xl bg-white hover:bg-gray-100 text-black font-bold text-sm transition-all disabled:opacity-40 hover:scale-105 shadow-lg">
              🔒 Post & Lock SRT
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }) {
  return (
    <div>
      <label className="text-white/50 text-xs mb-1.5 block">{label}</label>
      <input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-white/40 transition-colors"/>
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function CustomerJobs() {
  const navigate = useNavigate();
  const { wallet, runTx } = useGig();
  const userId = localStorage.getItem("userId");
  const token  = localStorage.getItem("token");

  const [srtBal,  setSrtBal]  = useState("0");
  const [gigs,    setGigs]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab,     setTab]     = useState("active");
  const [showCreate, setShowCreate] = useState(false);
  const [user,    setUser]    = useState(null);
  const [heroLoaded, setHeroLoaded] = useState(false);

  const activeGigs    = gigs.filter(g => !["COMPLETED","REFUNDED"].includes(g.status));
  const completedGigs = gigs.filter(g => g.status === "COMPLETED");
  const lockedSRT     = activeGigs.reduce((s,g)=>s+parseFloat(g.amount||g.srtAmount||0),0);
  const spentSRT      = completedGigs.reduce((s,g)=>s+parseFloat(g.amount||g.srtAmount||0),0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      if (userId) {
        const u = await fetch(`${BACKEND}/api/users/${userId}`,{headers:{Authorization:`Bearer ${token}`}});
        if (u.ok) setUser(await u.json());
      }
      if (wallet.signer && wallet.address) {
        const t   = new ethers.Contract(TOKEN_ADDR, TOKEN_ABI, wallet.signer);
        const [r, d] = await Promise.all([t.balanceOf(wallet.address), t.decimals()]);
        setSrtBal(ethers.formatUnits(r, d));
      }
      const res  = await fetch(`${BACKEND}/api/jobs/customer/${userId}`, {headers:{Authorization:`Bearer ${token}`}});
      const data = await res.json();
      const jobs = Array.isArray(data) ? data : [];

      // Use read-only provider for view calls to avoid MetaMask noise on missing gigs
      const esc = new ethers.Contract(ESCROW_ADDR, ESCROW_ABI, readProvider);
      const enriched = await Promise.all(jobs.map(async j => {
        try {
          const c = await esc.getGig(j._id);
          return {...j, gigId:c.gigId, gigNumber:Number(c.gigNumber), amount:ethers.formatEther(c.amount), status:STATUS_MAP[Number(c.status)]||j.status, proofIpfsHash:c.proofIpfsHash||j.proofIpfsHash};
        } catch { return {...j, gigId:j._id, amount:String(j.srtAmount||0)}; }
      }));
      setGigs(enriched);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  }, [userId, token, wallet.signer, wallet.address]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleApprove = async (gigId) => {
    const r = await runTx(() => {
      const e = new ethers.Contract(ESCROW_ADDR, ESCROW_ABI, wallet.signer);
      return e.approveWork(gigId);
    }, "Releasing SRT to freelancer...");
    if (r) {
      // Sync status to MongoDB after on-chain confirmation
      await fetch(`${BACKEND}/api/jobs/${gigId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: "COMPLETED", txHash: r.hash }),
      }).catch(() => {}); // non-fatal
      pushToast("💸 SRT released successfully!", "success", 6000);
      fetchData();
    }
  };

  const handleDispute = async (gigId) => {
    const r = await runTx(() => {
      const e = new ethers.Contract(ESCROW_ADDR, ESCROW_ABI, wallet.signer);
      return e.raiseDisputeAI(gigId);
    }, "Raising dispute (AI Tier 1)...");
    if (r) {
      // Sync status to MongoDB after on-chain confirmation
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
      pushToast("🤖 AI is reviewing your dispute", "info", 6000);
      fetchData();
    }
  };

  const displayGigs = tab === "active" ? activeGigs : completedGigs;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Ambient */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-white/3 rounded-full blur-3xl"/>
        <div className="absolute bottom-1/4 left-1/4 w-72 h-72 bg-white/2 rounded-full blur-3xl"/>
      </div>

      <Navbar />

      <div className="relative z-10 max-w-7xl mx-auto px-4 pt-6 pb-16">
        {/* ── HERO ──────────────────────────────────────────────────────── */}
        <div className="relative rounded-3xl overflow-hidden mb-8 border border-white/8">
          <div className={`transition-opacity duration-700 ${heroLoaded?"opacity-100":"opacity-0"}`}>
            <img src={clientImg} alt="Client dashboard" className="w-full h-52 sm:h-64 object-cover object-top"
              onLoad={()=>setHeroLoaded(true)}/>
          </div>
          {!heroLoaded && <div className="w-full h-52 sm:h-64 bg-white/4 animate-pulse"/>}
          <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-transparent"/>
          <div className="absolute inset-0 flex flex-col justify-center px-8">
            <p className="text-white/50 text-xs font-bold tracking-widest uppercase mb-2">🧑‍💼 Client Dashboard</p>
            <h1 className="text-3xl sm:text-4xl font-black mb-2 text-white">
              Hello, {user?.firstName || "Client"}
            </h1>
            <p className="text-white/50 text-sm max-w-lg">Post gigs, lock SRT in escrow, review proof, and release payment — all in one place.</p>
            <button onClick={()=>setShowCreate(true)}
              className="mt-4 inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-white hover:bg-gray-100 text-black font-bold text-sm transition-all hover:scale-105 shadow-xl w-fit">
              ➕ Post New Gig
            </button>
          </div>
        </div>

        {/* ── STATS ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            {label:"SRT Balance",      val:parseFloat(srtBal).toFixed(2), icon:"💎"},
            {label:"Locked in Escrow", val:lockedSRT.toFixed(2),          icon:"🔒"},
            {label:"Total Spent",      val:spentSRT.toFixed(2),           icon:"💸"},
            {label:"Active Gigs",      val:activeGigs.length,             icon:"📋"},
          ].map(({label,val,icon},i) => (
            <StatCard key={i} label={label} val={val} icon={icon} delay={i*100}/>
          ))}
        </div>

        {/* ── TABS + ACTIONS ────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex gap-2 bg-white/4 border border-white/8 rounded-2xl p-1.5 w-fit">
            {[["active","📋 Active"], ["completed","✅ Completed"]].map(([v,l]) => (
              <button key={v} onClick={()=>setTab(v)}
                className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200
                  ${tab===v ? "bg-white text-black shadow-lg" : "text-white/40 hover:text-white"}`}>
                {l} {v==="active"?`(${activeGigs.length})`:`(${completedGigs.length})`}
              </button>
            ))}
          </div>
          <button onClick={()=>fetchData()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/6 hover:bg-white/10 text-white/50 hover:text-white text-xs font-semibold transition-all border border-white/8">
            🔄 Refresh
          </button>
        </div>

        {/* ── GIGS ──────────────────────────────────────────────────────── */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1,2,3].map(i=><SkeletonGigCard key={i}/>)}
          </div>
        ) : displayGigs.length === 0 ? (
          <div className="rounded-2xl border border-white/8 bg-white/4 p-14 text-center">
            <p className="text-6xl mb-4 opacity-30">📋</p>
            <p className="text-white/60 text-lg font-semibold mb-2">
              {tab==="active" ? "No active gigs yet" : "No completed gigs yet"}
            </p>
            <p className="text-white/30 text-sm mb-6">Post your first gig and find the perfect freelancer.</p>
            <button onClick={()=>setShowCreate(true)}
              className="px-6 py-3 rounded-xl bg-white hover:bg-gray-100 text-black font-semibold text-sm hover:scale-105 transition-all shadow-lg">
              ➕ Post a Gig →
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {displayGigs.map((g,i) => (
              <GigCard key={g.gigId||g._id} gig={g} idx={i}
                onApprove={handleApprove}
                onDispute={handleDispute}
                onView={(id)=>navigate(`/ResolutionCenter?gig=${id}`)}/>
            ))}
          </div>
        )}
      </div>

      {/* Create modal */}
      {showCreate && (
        <CreateGigModal srtBalance={srtBal} user={user} onClose={()=>setShowCreate(false)} onCreated={fetchData}/>
      )}
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, val, icon, delay }) {
  const [ref, vis] = useFade(delay);
  return (
    <div ref={ref} style={{transitionDelay:`${delay}ms`}}
      className={`rounded-2xl border border-white/10 bg-white/5 p-5 transition-all duration-700 hover:scale-[1.02] hover:bg-white/8
        ${vis?"opacity-100 translate-y-0":"opacity-0 translate-y-4"}`}>
      <p className="text-2xl mb-2">{icon}</p>
      <p className="text-white font-black text-2xl"><Counter target={parseFloat(val)}/> SRT</p>
      <p className="text-white/40 text-xs mt-1">{label}</p>
    </div>
  );
}
