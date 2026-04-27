import React, { useState, useEffect, useCallback, useRef } from "react";
import { ethers } from "ethers";
import { useNavigate } from "react-router-dom";
import { useGig, pushToast } from "../context/GigContext";
import { SkeletonGigCard } from "../components/Skeleton";
import Navbar from "../navbar";
import clientImg from "../assets/client_dashboard_hero.png";

const BACKEND     = import.meta.env.VITE_BACKEND_URL ?? "http://localhost:5010";
const ESCROW_ADDR = (import.meta.env.VITE_ESCROW_CONTRACT_ADDRESS || "0x8eFa974E68A449B25Db77B73841dc14921A98Ba5").trim();
const TOKEN_ADDR  = (import.meta.env.VITE_TOKEN_CONTRACT_ADDRESS  || "0x5D3976fc3F92174da8F851a12a5b0056CC6783A0").trim();
const RPC_URL     = import.meta.env.VITE_RPC_URL || "https://rpc.sepolia.org";
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

const STATUS_META = {
  OPEN:            { label:"Open",            rail:"bg-grad-success", pill:"bg-[var(--success-bg)] text-success border-success/30",       dot:"bg-success" },
  ASSIGNED:        { label:"Assigned",        rail:"bg-escrow",       pill:"bg-[var(--info-bg)] text-info border-info/30",                dot:"bg-info" },
  PROOF_SUBMITTED: { label:"In Review",       rail:"bg-gold",         pill:"bg-primary/10 text-primary border-primary/30",               dot:"bg-primary" },
  DISPUTED_AI:     { label:"Disputed · AI",   rail:"bg-grad-danger",  pill:"bg-[var(--destructive-bg)] text-destructive border-destructive/30", dot:"bg-destructive" },
  DISPUTED_KLEROS: { label:"Disputed · Kleros",rail:"bg-grad-danger", pill:"bg-[var(--destructive-bg)] text-destructive border-destructive/30", dot:"bg-destructive" },
  DISPUTED_HUMAN:  { label:"Disputed · Admin",rail:"bg-grad-danger",  pill:"bg-[var(--destructive-bg)] text-destructive border-destructive/30", dot:"bg-destructive" },
  COMPLETED:       { label:"Completed",       rail:"bg-[var(--muted-foreground)]", pill:"bg-surface-2 text-muted-foreground border-hairline", dot:"bg-muted-foreground" },
  REFUNDED:        { label:"Refunded",        rail:"bg-surface-2",    pill:"bg-surface-2 text-muted-foreground border-hairline",         dot:"bg-muted-foreground" },
};

// ─── Hooks ────────────────────────────────────────────────────────────────────
function useFade(delay = 0) {
  const ref = useRef(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVis(true); obs.disconnect(); }}, { threshold: 0.06 });
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

// ─── Status Pill ──────────────────────────────────────────────────────────────
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
    navigator.clipboard.writeText(id||"").then(() => { setCopied(true); setTimeout(()=>setCopied(false), 1500); });
  };
  return (
    <div className="flex items-center gap-1.5 mt-1">
      <p className="font-mono-tab text-[11px] text-muted-foreground break-all leading-tight">{id}</p>
      <button onClick={copy} title="Copy"
        className="shrink-0 text-muted-foreground/50 hover:text-muted-foreground transition-colors text-[11px]">
        {copied ? "✓" : "⧉"}
      </button>
    </div>
  );
}

// ─── Proof Viewer ─────────────────────────────────────────────────────────────
function ProofViewer({ ipfsHash }) {
  const [fileUrl, setFileUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!ipfsHash) return;
    const cid = ipfsHash.replace("/ipfs/","").replace("ipfs://","");
    fetch(`https://gateway.pinata.cloud/ipfs/${cid}`)
      .then(r => r.json())
      .then(data => {
        if (data.fileUri) {
          const fc = data.fileUri.replace("/ipfs/","").replace("ipfs://","");
          setFileUrl(`https://gateway.pinata.cloud/ipfs/${fc}`);
        }
      })
      .catch(() => setFileUrl(`https://gateway.pinata.cloud/ipfs/${cid}`))
      .finally(() => setLoading(false));
  }, [ipfsHash]);
  return (
    <div className="mt-2 p-3 rounded-xl bg-surface-2 border border-hairline">
      {loading ? (
        <p className="text-muted-foreground text-xs">Loading proof…</p>
      ) : fileUrl ? (
        <a href={fileUrl} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-surface border border-hairline
            hover:border-primary/40 text-foreground text-xs font-semibold transition-all">
          📄 Open Proof File
        </a>
      ) : (
        <p className="text-muted-foreground text-xs">Could not load proof.</p>
      )}
    </div>
  );
}

// ─── Gig Card ─────────────────────────────────────────────────────────────────
function GigCard({ gig, onApprove, onDispute, onView, idx }) {
  const [ref, vis] = useFade(idx*80);
  const [showProof, setShowProof] = useState(false);
  const isSettled  = ["COMPLETED","REFUNDED"].includes(gig.status);
  const hasProof   = Boolean(gig.proofIpfsHash);
  const canApprove = gig.status === "PROOF_SUBMITTED";
  const canDispute = gig.status === "PROOF_SUBMITTED";
  const meta       = STATUS_META[gig.status] || STATUS_META.OPEN;

  return (
    <article ref={ref} style={{transitionDelay:`${idx*80}ms`, animationDelay:`${idx*80}ms`}}
      className={`group shadow-card relative overflow-hidden rounded-2xl border border-hairline bg-surface
        transition-all duration-500 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-glow
        ${vis ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>

      {/* Left color rail */}
      <div className={`absolute inset-y-0 left-0 w-1 ${meta.rail}`} />

      <div className="p-5 pl-7">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              {gig.gigNumber && (
                <span className="font-mono-tab rounded-md bg-surface-2 px-2 py-0.5 text-[11px] text-muted-foreground">
                  GIG #{gig.gigNumber}
                </span>
              )}
              <StatusPill s={gig.status} />
            </div>
            <h3 className="text-display text-base font-semibold text-foreground truncate">{gig.title || "Untitled"}</h3>
            <GigIdRow id={gig.gigId||gig._id} />
          </div>
          {/* Amount box */}
          <div className="rounded-xl border border-hairline bg-background/40 px-4 py-2.5 text-right shrink-0">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">
              {isSettled ? "Released" : "Locked"}
            </p>
            <p className="text-display text-xl font-semibold text-foreground">
              {parseFloat(gig.amount||gig.srtAmount||0).toFixed(1)}
              <span className="text-sm text-muted-foreground ml-1">SRT</span>
            </p>
          </div>
        </div>

        {gig.content && <p className="text-muted-foreground text-xs mb-3 line-clamp-2">{gig.content}</p>}

        {/* Assignee */}
        {gig.assignedFreelancer && (
          <div className="flex items-center gap-2.5 mb-3 p-2.5 rounded-xl bg-surface-2 border border-hairline">
            <div className="w-7 h-7 rounded-full bg-gold flex items-center justify-center text-xs font-bold text-white">
              {gig.assignedFreelancer?.firstName?.[0] || "F"}
            </div>
            <div>
              <p className="text-foreground text-xs font-semibold">
                {gig.assignedFreelancer?.firstName} {gig.assignedFreelancer?.lastName}
              </p>
              <p className="text-muted-foreground text-[10px]">Assigned freelancer</p>
            </div>
          </div>
        )}

        {/* Status info strips */}
        {!isSettled && (
          <div className="flex items-center gap-2 mb-3 py-1.5 px-3 rounded-lg bg-surface-2 border border-hairline">
            <span className="text-xs">🔒</span>
            <span className="text-muted-foreground text-xs">
              {parseFloat(gig.amount||gig.srtAmount||0).toFixed(2)} SRT locked in escrow
            </span>
          </div>
        )}
        {gig.status === "COMPLETED" && (
          <div className="flex items-center gap-2 mb-3 py-1.5 px-3 rounded-lg bg-[var(--success-bg)] border border-success/20">
            <span className="text-xs">✅</span>
            <span className="text-success text-xs font-semibold">Payment released to freelancer</span>
          </div>
        )}
        {gig.status === "DISPUTED_AI" && (
          <div className="flex items-center gap-2 mb-3 py-1.5 px-3 rounded-lg bg-[var(--warning-bg)] border border-warning/20">
            <span className="text-xs">🤖</span>
            <span className="text-warning text-xs font-semibold">AI is reviewing this dispute</span>
          </div>
        )}
        {gig.status === "DISPUTED_KLEROS" && (
          <div className="flex items-center gap-2 mb-3 py-1.5 px-3 rounded-lg bg-[var(--destructive-bg)] border border-destructive/20">
            <span className="text-xs">⚖️</span>
            <span className="text-destructive text-xs font-semibold">Kleros jurors are voting</span>
          </div>
        )}

        {/* Proof */}
        {hasProof && (
          <div className="mb-3">
            <button onClick={() => setShowProof(v=>!v)}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-xs font-semibold transition-colors">
              📎 {showProof ? "Hide" : "View"} submitted proof
              <span className={`transition-transform duration-200 text-[10px] ${showProof?"-rotate-90":"rotate-0"}`}>▶</span>
            </button>
            {showProof && <ProofViewer ipfsHash={gig.proofIpfsHash} />}
          </div>
        )}

        {/* Divider */}
        <div className="h-px bg-hairline mb-3" />

        {/* Actions */}
        <div className="flex gap-2 flex-wrap">
          {canApprove && (
            <button onClick={() => onApprove(gig.gigId||gig._id)}
              className="bg-gold inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold text-white shadow-glow hover:opacity-90 transition-all hover:scale-105">
              ✅ Approve & Release
            </button>
          )}
          {canDispute && (
            <button onClick={() => onDispute(gig.gigId||gig._id)}
              className="bg-grad-danger inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold text-white transition-all hover:scale-105">
              ⚠️ Raise Dispute
            </button>
          )}
          <button onClick={() => onView(gig.gigId||gig._id)}
            className="glass inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-all">
            ⚖️ Resolution
          </button>
        </div>
      </div>
    </article>
  );
}

// ─── Field ────────────────────────────────────────────────────────────────────
function Field({ label, value, onChange, placeholder, type = "text" }) {
  return (
    <div>
      <label className="text-muted-foreground text-xs font-semibold mb-1.5 block uppercase tracking-wide">{label}</label>
      <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
        className="w-full bg-surface-2 border border-hairline rounded-xl px-4 py-2.5 text-sm text-foreground
          placeholder-muted-foreground/50 focus:outline-none focus:border-primary/50 transition-colors"/>
    </div>
  );
}

// ─── Create Gig Modal ─────────────────────────────────────────────────────────
function CreateGigModal({ onClose, onCreated, srtBalance, user }) {
  const { wallet, runTx } = useGig();
  const userId = localStorage.getItem("userId");
  const token  = localStorage.getItem("token");
  const [form, setForm] = useState({ title:"", content:"", srtAmount:"", deadline:"" });
  const [step, setStep]  = useState(1);
  const [saving, setSaving] = useState(false);
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const handleCreate = async () => {
    if (!form.title || !form.content || !form.srtAmount) { pushToast("Please fill in all required fields","warning"); return; }
    if (!wallet.signer) { pushToast("Connect your wallet first","warning"); return; }
    if (parseFloat(form.srtAmount) > parseFloat(srtBalance)) { pushToast(`Insufficient SRT balance (${srtBalance} SRT)`,"error"); return; }
    setSaving(true); setStep(2);
    try {
      const res  = await fetch(`${BACKEND}/api/posts`, {
        method:"POST", headers:{"Content-Type":"application/json", Authorization:`Bearer ${token}`},
        body: JSON.stringify({ userId, title:form.title, content:form.content, userType:"client", postType:"job",
          srtAmount: parseFloat(form.srtAmount), deadline: form.deadline ? Math.floor(new Date(form.deadline)/1000) : Math.floor(Date.now()/1000)+30*24*60*60,
          walletAddress: wallet.address })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      const gigId = data.post._id;

      pushToast("Step 1/3 — Uploading gig context to IPFS...","loading",20000);
      const metaRes = await fetch(`${BACKEND}/api/dispute/upload-meta`, {
        method:"POST", headers:{"Content-Type":"application/json", Authorization:`Bearer ${token}`},
        body: JSON.stringify({ gigId, title:form.title, description:form.content, budget:form.srtAmount,
          deadline:form.deadline||null, clientName: user ? `${user.firstName} ${user.lastName}` : "Client" }),
      });
      if (!metaRes.ok) { const e = await metaRes.json().catch(()=>({})); throw new Error(e.error||"IPFS upload failed"); }
      const { metaEvidenceUri } = await metaRes.json();
      pushToast("✅ MetaEvidence uploaded","success");

      pushToast("Step 2/3 — Approve SRT spend in MetaMask...","loading",20000);
      const tokenC = new ethers.Contract(TOKEN_ADDR, TOKEN_ABI, wallet.signer);
      const dec    = await tokenC.decimals();
      const rawAmt = ethers.parseUnits(form.srtAmount, dec);
      await (await tokenC.approve(ESCROW_ADDR, rawAmt)).wait();
      pushToast("✅ Approval done","success");

      const receipt = await runTx(() => {
        const esc = new ethers.Contract(ESCROW_ADDR, ESCROW_ABI, wallet.signer);
        const dl  = form.deadline ? Math.floor(new Date(form.deadline)/1000) : Math.floor(Date.now()/1000)+30*24*60*60;
        return esc.createGig(gigId, rawAmt, dl, metaEvidenceUri);
      }, "Locking SRT in escrow...");

      if (receipt) {
        await fetch(`${BACKEND}/api/jobs/${gigId}/status`, {
          method:"PATCH", headers:{"Content-Type":"application/json", Authorization:`Bearer ${token}`},
          body: JSON.stringify({ status:"OPEN", txHash:receipt.hash }),
        }).catch(()=>{});
        pushToast(`🔒 ${form.srtAmount} SRT locked! Gig is live.`,"success",6000);
        onCreated(); onClose();
      } else { setStep(1); }
    } catch(e) { pushToast(e.reason||e.message,"error"); setStep(1); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose}/>
      <div className="relative w-full max-w-lg rounded-3xl border border-hairline bg-surface shadow-island backdrop-blur-xl p-7 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-display text-xl font-semibold text-foreground">Post a New Gig</h2>
            <p className="text-muted-foreground text-xs mt-0.5">Funds lock automatically on submit</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl transition-colors">✕</button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2">
          {[1,2,3].map(s => (
            <React.Fragment key={s}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all
                ${step >= s ? "bg-gold text-white" : "bg-surface-2 text-muted-foreground border border-hairline"}`}>{s}</div>
              {s<3 && <div className={`flex-1 h-0.5 rounded transition-all ${step>s ? "bg-gold" : "bg-hairline"}`}/>}
            </React.Fragment>
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <Field label="Gig Title *" value={form.title} onChange={v=>set("title",v)} placeholder="e.g. Build a React dashboard" />
            <div>
              <label className="text-muted-foreground text-xs font-semibold mb-1.5 block uppercase tracking-wide">Description *</label>
              <textarea value={form.content} onChange={e=>set("content",e.target.value)} rows={3}
                placeholder="Describe the work in detail..."
                className="w-full bg-surface-2 border border-hairline rounded-xl px-4 py-3 text-sm text-foreground
                  placeholder-muted-foreground/50 focus:outline-none focus:border-primary/50 resize-none transition-colors"/>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Field label="SRT Amount *" type="number" value={form.srtAmount} onChange={v=>set("srtAmount",v)} placeholder="e.g. 100" />
                <p className="text-muted-foreground text-[10px] mt-1">Balance: {parseFloat(srtBalance||"0").toFixed(2)} SRT</p>
              </div>
              <Field label="Deadline (optional)" type="date" value={form.deadline} onChange={v=>set("deadline",v)} placeholder="" />
            </div>
            <div className="bg-surface-2 border border-hairline rounded-xl p-3 text-xs text-muted-foreground">
              <strong className="text-foreground">3 steps:</strong> IPFS upload → Approve SRT → Lock in escrow. Funds release only on your approval.
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col items-center py-8 gap-4">
            <div className="w-16 h-16 rounded-full bg-gold flex items-center justify-center text-3xl animate-pulse-dot">🔒</div>
            <p className="text-foreground font-semibold">Locking SRT in escrow…</p>
            <p className="text-muted-foreground text-sm text-center">Check MetaMask for prompts. Don't close this window.</p>
          </div>
        )}

        {step === 1 && (
          <div className="flex gap-3">
            <button onClick={onClose}
              className="flex-1 py-3 rounded-xl glass text-muted-foreground font-semibold text-sm transition-all hover:text-foreground">
              Cancel
            </button>
            <button onClick={handleCreate} disabled={saving}
              className="flex-1 py-3 rounded-xl bg-gold text-white font-semibold text-sm shadow-glow transition-all disabled:opacity-40 hover:opacity-90">
              🔒 Post & Lock SRT
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, val, icon, delay, tone }) {
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
      <p className="text-display text-2xl font-semibold text-foreground"><Counter target={parseFloat(val)}/></p>
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
        const t = new ethers.Contract(TOKEN_ADDR, TOKEN_ABI, wallet.signer);
        const [r, d] = await Promise.all([t.balanceOf(wallet.address), t.decimals()]);
        setSrtBal(ethers.formatUnits(r, d));
      }
      const res  = await fetch(`${BACKEND}/api/jobs/customer/${userId}`, {headers:{Authorization:`Bearer ${token}`}});
      const data = await res.json();
      const jobs = Array.isArray(data) ? data : [];
      const esc  = new ethers.Contract(ESCROW_ADDR, ESCROW_ABI, readProvider);
      const enriched = (await Promise.all(jobs.map(async j => {
        try {
          const c = await esc.getGig(j._id);
          return {...j, gigId:c.gigId, gigNumber:Number(c.gigNumber), amount:ethers.formatEther(c.amount),
            status:STATUS_MAP[Number(c.status)]||j.status, proofIpfsHash:c.proofIpfsHash||j.proofIpfsHash};
        } catch { return null; }
      }))).filter(Boolean);
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
      await fetch(`${BACKEND}/api/jobs/${gigId}/status`, {
        method:"PATCH", headers:{"Content-Type":"application/json", Authorization:`Bearer ${token}`},
        body: JSON.stringify({ status:"COMPLETED", txHash:r.hash }),
      }).catch(()=>{});
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
      pushToast("🤖 AI is reviewing your dispute", "info", 6000);
      fetchData();
    }
  };

  const displayGigs = tab === "active" ? activeGigs : completedGigs;
  const disputedCount = gigs.filter(g => g.status?.startsWith("DISPUTED")).length;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Ambient glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-1/3 right-1/4 w-96 h-96 rounded-full bg-primary/5 blur-3xl animate-float-slow" />
        <div className="absolute bottom-1/4 left-1/4 w-72 h-72 rounded-full bg-accent/4 blur-3xl" />
      </div>

      <Navbar />

      <main className="relative z-10 max-w-7xl mx-auto px-4 pt-6 pb-20">

        {/* ── HERO ──────────────────────────────────────────────────── */}
        <div className="grain relative rounded-3xl overflow-hidden mb-8 border border-hairline shadow-card">
          <div className={`transition-opacity duration-700 ${heroLoaded?"opacity-100":"opacity-0"}`}>
            <img src={clientImg} alt="Client dashboard" className="w-full h-52 sm:h-64 object-cover object-top"
              onLoad={()=>setHeroLoaded(true)}/>
          </div>
          {!heroLoaded && <div className="w-full h-52 sm:h-64 bg-surface-2 animate-pulse"/>}
          <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/70 to-transparent"/>
          <div className="absolute inset-0 flex flex-col justify-center px-8">
            <p className="text-muted-foreground text-xs font-bold tracking-widest uppercase mb-2">🧑‍💼 Client Dashboard</p>
            <h1 className="text-display text-3xl sm:text-4xl font-semibold mb-2 text-foreground">
              Welcome back, <span className="bg-gold bg-clip-text text-transparent">{user?.firstName || "Client"}</span>
            </h1>
            <p className="text-muted-foreground text-sm max-w-lg">Post gigs, lock SRT in escrow, review proof, and release payment.</p>
            <button onClick={()=>setShowCreate(true)}
              className="mt-5 bg-gold inline-flex items-center gap-2 px-6 py-3 rounded-full text-white font-semibold text-sm shadow-glow hover:opacity-90 transition-all hover:scale-105 w-fit">
              + Post New Gig
            </button>
          </div>
        </div>

        {/* ── DISPUTE NOTICE ───────────────────────────────────────── */}
        {disputedCount > 0 && (
          <div className="glass flex flex-wrap items-center justify-between gap-3 rounded-2xl border-l-4 border-l-warning px-5 py-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[var(--warning-bg)] text-warning flex items-center justify-center text-sm">⚠️</div>
              <div className="text-sm">
                <p className="font-semibold text-foreground">{disputedCount} dispute{disputedCount>1?"s":""} awaiting your input</p>
                <p className="text-muted-foreground text-xs">Respond within 48h or the case escalates to Kleros jurors.</p>
              </div>
            </div>
            <button onClick={()=>setTab("active")}
              className="text-sm font-semibold text-primary hover:opacity-80 transition-opacity">
              Review →
            </button>
          </div>
        )}

        {/* ── STATS ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard label="SRT Balance"      val={parseFloat(srtBal).toFixed(2)} icon="💎" delay={0}   tone="primary" />
          <StatCard label="Locked in Escrow" val={lockedSRT.toFixed(2)}          icon="🔒" delay={80}  tone="warning" />
          <StatCard label="Total Spent"      val={spentSRT.toFixed(2)}           icon="💸" delay={160} tone="default" />
          <StatCard label="Active Gigs"      val={activeGigs.length}             icon="📋" delay={240} tone="success" />
        </div>

        {/* ── TABS ─────────────────────────────────────────────────── */}
        <div className="glass sticky top-3 z-20 flex items-center justify-between rounded-2xl p-2 mb-6 shadow-soft">
          <div className="flex gap-1">
            {[["active","Active",activeGigs.length], ["completed","Completed",completedGigs.length]].map(([v,l,count]) => (
              <button key={v} onClick={()=>setTab(v)}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200
                  ${tab===v ? "bg-foreground text-background shadow-soft" : "text-muted-foreground hover:text-foreground hover:bg-surface-2"}`}>
                {l}
                <span className={`font-mono-tab rounded-md px-1.5 py-0.5 text-[10px]
                  ${tab===v ? "bg-background/15 text-background" : "bg-surface-2 text-muted-foreground"}`}>
                  {count}
                </span>
              </button>
            ))}
          </div>
          <button onClick={()=>fetchData()}
            className="glass inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-all">
            🔄 Refresh
          </button>
        </div>

        {/* ── GIGS ─────────────────────────────────────────────────── */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1,2,3].map(i=><SkeletonGigCard key={i}/>)}
          </div>
        ) : displayGigs.length === 0 ? (
          <div className="glass rounded-3xl py-20 text-center border border-hairline">
            <p className="text-5xl mb-4 opacity-30">📋</p>
            <h3 className="text-foreground text-lg font-semibold mb-2">
              {tab==="active" ? "No active gigs yet" : "No completed gigs yet"}
            </h3>
            <p className="text-muted-foreground text-sm mb-6">Post your first gig and find the perfect freelancer.</p>
            <button onClick={()=>setShowCreate(true)}
              className="bg-gold inline-flex items-center gap-2 px-6 py-3 rounded-full text-white font-semibold text-sm shadow-glow hover:opacity-90 transition-all">
              + Post a Gig
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
      </main>

      {showCreate && (
        <CreateGigModal srtBalance={srtBal} user={user} onClose={()=>setShowCreate(false)} onCreated={fetchData}/>
      )}
    </div>
  );
}
