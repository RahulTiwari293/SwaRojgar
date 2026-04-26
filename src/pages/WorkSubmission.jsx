/**
 * WorkSubmission.jsx — Freelancer submits proof-of-work
 *
 * Flow:
 *  1. Read gigId from navigation state (set by FreelancerJobs navigate call)
 *  2. Fetch job details from /api/jobs/:gigId/details
 *  3. Upload proof files + description to /api/dispute/upload-evidence → IPFS URI
 *  4. Call GigEscrow.submitProof(gigId, ipfsHash) on-chain
 *  5. PATCH /api/jobs/:gigId/status → PROOF_SUBMITTED with ipfsHash + txHash
 */

import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ethers } from "ethers";
import { useGig, pushToast } from "../context/GigContext";
import Navbar from "../navbar";

const BACKEND     = import.meta.env.VITE_BACKEND_URL || "http://localhost:5010";
const ESCROW_ADDR = (import.meta.env.VITE_ESCROW_CONTRACT_ADDRESS || "0x8eFa974E68A449B25Db77B73841dc14921A98Ba5").trim();
const ESCROW_ABI  = [
  "function submitProof(string gigId, string ipfsHash) external",
];

export default function WorkSubmission() {
  const location = useLocation();
  const navigate  = useNavigate();
  const { wallet, runTx } = useGig();

  const token  = localStorage.getItem("token");
  const userId = localStorage.getItem("userId");

  const gigId = location.state?.gigId;

  const [job,       setJob]       = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [files,     setFiles]     = useState([]);
  const [desc,      setDesc]      = useState("");
  const [submitting,setSubmitting]= useState(false);
  const [step,      setStep]      = useState(1);

  useEffect(() => {
    if (!gigId) {
      pushToast("No gig selected. Go to your dashboard first.", "warning");
      navigate("/freelancer-jobs");
    }
  }, [gigId, navigate]);

  useEffect(() => {
    if (!gigId) return;
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${BACKEND}/api/jobs/${gigId}/details`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Job not found");
        setJob(await res.json());
      } catch (e) {
        pushToast(e.message, "error");
        navigate("/freelancer-jobs");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [gigId, token, navigate]);

  const addFiles = (newFiles) => {
    setFiles(prev => [...prev, ...Array.from(newFiles)]);
  };

  const removeFile = (idx) => setFiles(f => f.filter((_, i) => i !== idx));

  const onDrop = (e) => {
    e.preventDefault();
    addFiles(e.dataTransfer.files);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!files.length)     { pushToast("Upload at least one proof file", "warning"); return; }
    if (!desc.trim())      { pushToast("Add a work description", "warning"); return; }
    if (!wallet.signer)    { pushToast("Connect your wallet first", "warning"); return; }

    setSubmitting(true);
    setStep(2);

    try {
      pushToast("📤 Uploading proof to IPFS...", "loading", 30000);
      const form = new FormData();
      files.forEach(f => form.append("file", f));
      form.append("gigId",       gigId);
      form.append("description", desc);
      form.append("submittedBy", userId || "freelancer");
      form.append("name",        `Proof for ${job?.title || gigId}`);

      const uploadRes = await fetch(`${BACKEND}/api/dispute/upload-evidence`, {
        method:  "POST",
        headers: { Authorization: `Bearer ${token}` },
        body:    form,
      });
      if (!uploadRes.ok) {
        const err = await uploadRes.json();
        throw new Error(err.error || "IPFS upload failed");
      }
      const { evidenceUri } = await uploadRes.json();

      const ipfsHash = evidenceUri.replace("/ipfs/", "").replace("ipfs://", "");
      pushToast("✅ Proof uploaded to IPFS", "success");

      const receipt = await runTx(() => {
        const esc = new ethers.Contract(ESCROW_ADDR, ESCROW_ABI, wallet.signer);
        return esc.submitProof(gigId, ipfsHash);
      }, "Recording proof on blockchain...");

      if (!receipt) { setStep(1); setSubmitting(false); return; }

      await fetch(`${BACKEND}/api/jobs/${gigId}/status`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          status:          "PROOF_SUBMITTED",
          proofIpfsHash:   ipfsHash,
          proofDescription: desc,
          txHash:          receipt.hash,
        }),
      });

      setStep(3);
      pushToast("🎉 Work submitted! Client is reviewing.", "success", 8000);
    } catch (e) {
      pushToast(e.message || "Submission failed", "error");
      setStep(1);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <div className="w-8 h-8 border-2 border-white/40 border-t-white rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (step === 3) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white">
        <Navbar />
        <div className="max-w-lg mx-auto px-4 pt-24 text-center">
          <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center text-4xl mx-auto mb-6">
            🎉
          </div>
          <h1 className="text-2xl font-black text-white mb-3">Work Submitted!</h1>
          <p className="text-white/50 text-sm mb-8">
            Your proof has been uploaded to IPFS and recorded on-chain. The client will review and release payment.
          </p>
          <button
            onClick={() => navigate("/freelancer-jobs")}
            className="px-8 py-3 rounded-2xl bg-white hover:bg-gray-100 text-black font-bold text-sm transition-all"
          >
            Back to Dashboard →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <Navbar />

      <div className="max-w-2xl mx-auto px-4 pt-8 pb-16">

        {/* Header */}
        <div className="mb-8">
          <button onClick={() => navigate("/freelancer-jobs")}
            className="flex items-center gap-2 text-white/40 hover:text-white/70 text-sm mb-4 transition-colors">
            ← Back to Dashboard
          </button>
          <h1 className="text-3xl font-black text-white mb-1">Submit Work</h1>
          <p className="text-white/40 text-sm">Upload your proof — client reviews, then payment releases automatically.</p>
        </div>

        {/* Job info card */}
        {job && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 mb-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                {job.gigNumber && <p className="text-white/40 text-xs font-bold mb-1">Gig #{job.gigNumber}</p>}
                <h2 className="text-white font-semibold text-base">{job.title}</h2>
                <p className="text-white/40 text-xs mt-1 line-clamp-2">{job.content}</p>
              </div>
              <span className="text-white font-bold text-lg shrink-0">{job.srtAmount} SRT</span>
            </div>
          </div>
        )}

        {/* Steps indicator */}
        <div className="flex items-center gap-2 mb-8">
          {["Upload Proof", "Record On-Chain", "Done"].map((label, i) => {
            const s = i + 1;
            const active = step === s;
            const done   = step > s;
            return (
              <React.Fragment key={s}>
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                    ${done ? "bg-white text-black" : active ? "bg-white text-black" : "bg-white/8 text-white/30"}`}>
                    {done ? "✓" : s}
                  </div>
                  <span className={`text-xs font-medium ${active ? "text-white" : "text-white/30"}`}>{label}</span>
                </div>
                {s < 3 && <div className={`flex-1 h-0.5 rounded ${done ? "bg-white" : "bg-white/10"}`} />}
              </React.Fragment>
            );
          })}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* File upload */}
          <div>
            <label className="text-white/60 text-sm font-semibold mb-2 block">Proof Files *</label>
            <div
              onDragOver={e => e.preventDefault()}
              onDrop={onDrop}
              onClick={() => document.getElementById("ws-file-input").click()}
              className="group cursor-pointer rounded-2xl border-2 border-dashed border-white/15 hover:border-white/30 bg-white/3 hover:bg-white/5 transition-all p-10 text-center"
            >
              <input
                id="ws-file-input" type="file" multiple
                onChange={e => addFiles(e.target.files)}
                accept="image/*,video/*,.pdf,.doc,.docx,.zip,.txt"
                className="hidden"
              />
              <p className="text-4xl mb-3">📁</p>
              <p className="text-white/50 text-sm font-semibold">Drag & drop or click to browse</p>
              <p className="text-white/25 text-xs mt-1">Images, video, PDF, documents, ZIP — up to 20 MB</p>
            </div>

            {files.length > 0 && (
              <div className="mt-3 space-y-2">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-white/4 border border-white/8">
                    <div className="flex items-center gap-3">
                      <span className="text-white/60">📄</span>
                      <span className="text-white/70 text-xs font-mono truncate max-w-xs">{f.name}</span>
                      <span className="text-white/30 text-xs">{(f.size / 1024 / 1024).toFixed(2)} MB</span>
                    </div>
                    <button type="button" onClick={() => removeFile(i)}
                      className="text-white/25 hover:text-white/60 transition-colors text-sm font-bold">✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="text-white/60 text-sm font-semibold mb-2 block">Work Description *</label>
            <textarea
              value={desc}
              onChange={e => setDesc(e.target.value)}
              rows={5}
              placeholder="Describe what you built, what was delivered, any notes for the client, and links to live demos..."
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 focus:outline-none focus:border-white/40 resize-none transition-colors"
              required
            />
          </div>

          {/* Wallet warning */}
          {!wallet.connected && (
            <div className="p-4 rounded-xl bg-white/5 border border-white/15 text-white/60 text-xs">
              ⚠️ Connect your wallet before submitting — the proof hash needs to be signed on-chain.
            </div>
          )}

          {/* Submit */}
          <div className="flex gap-3">
            <button type="button" onClick={() => navigate("/freelancer-jobs")}
              className="flex-1 py-3.5 rounded-2xl bg-white/6 hover:bg-white/10 text-white/60 font-semibold text-sm border border-white/8 transition-all">
              Cancel
            </button>
            <button type="submit" disabled={submitting || !wallet.connected}
              className="flex-1 py-3.5 rounded-2xl bg-white hover:bg-gray-100 text-black font-bold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {submitting
                ? <><span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" /> Processing...</>
                : "Submit Work for Review"
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
