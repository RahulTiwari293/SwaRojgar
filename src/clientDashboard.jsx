import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "./navbar.jsx";

const API_URL = import.meta.env.VITE_BACKEND_URL ?? "http://localhost:5010";

/* ─── Dot grid background ─────────────────────────────────────────────────── */
function DotBg({ light = false, className = "" }) {
  return (
    <div
      className={`absolute inset-0 pointer-events-none ${className}`}
      style={{
        backgroundImage: `radial-gradient(circle, ${light ? "#00000018" : "#ffffff18"} 1.5px, transparent 1.5px)`,
        backgroundSize: "28px 28px",
      }}
    />
  );
}

/* ─── Animated number counter ─────────────────────────────────────────────── */
function Counter({ value }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!value) return;
    let start = 0;
    const step = Math.max(1, Math.floor(value / 40));
    const t = setInterval(() => {
      start = Math.min(start + step, value);
      setN(start);
      if (start >= value) clearInterval(t);
    }, 30);
    return () => clearInterval(t);
  }, [value]);
  return <>{n}</>;
}

/* ─── Status badge ───────────────────────────────────────────────────────── */
const STATUS_STYLES = {
  OPEN:             "bg-white text-black border border-black",
  ASSIGNED:         "bg-gray-900 text-white",
  PROOF_SUBMITTED:  "bg-gray-700 text-white",
  COMPLETED:        "bg-black text-white",
  DISPUTED_AI:      "bg-gray-600 text-white",
  DISPUTED_KLEROS:  "bg-gray-500 text-white",
  DISPUTED_HUMAN:   "bg-gray-800 text-white",
  REFUNDED:         "bg-gray-200 text-gray-700",
};

/* ══════════════════════════════════════════════════════════════════════════ */
export default function ClientDashboard() {
  const navigate = useNavigate();
  const carouselRef = useRef(null);
  const [jobs, setJobs]   = useState([]);
  const [user, setUser]   = useState(null);
  const [loading, setLoading] = useState(true);

  const userId = localStorage.getItem("userId");
  const token  = localStorage.getItem("token");

  useEffect(() => {
    if (!userId || !token) { navigate("/login"); return; }
    Promise.all([
      fetch(`${API_URL}/api/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(r => r.json()),
      fetch(`${API_URL}/api/jobs/customer/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(r => r.json()),
    ])
      .then(([u, j]) => { setUser(u); setJobs(Array.isArray(j) ? j : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const stats = {
    total:     jobs.length,
    active:    jobs.filter(j => ["OPEN","ASSIGNED","PROOF_SUBMITTED"].includes(j.status)).length,
    completed: jobs.filter(j => j.status === "COMPLETED").length,
    disputed:  jobs.filter(j => (j.status || "").includes("DISPUTED")).length,
  };

  const name = user?.firstName || localStorage.getItem("firstName") || "Client";

  /* ── Loading ────────────────────────────────────────────────────── */
  if (loading) return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center flex-col gap-4">
      <div className="w-14 h-14 rounded-full border-4 border-black dark:border-white border-t-transparent animate-spin" />
      <p className="text-xs font-bold tracking-[0.3em] uppercase text-gray-400 dark:text-gray-500">Loading Dashboard</p>
    </div>
  );

  return (
    <>
      <style>{`
        @keyframes floatUp { from { opacity:0; transform:translateY(20px) } to { opacity:1; transform:translateY(0) } }
        @keyframes orb1 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(30px,-20px)} }
        @keyframes orb2 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(-20px,30px)} }
        .float-in { animation: floatUp 0.6s ease both; }
        .card-hover { transition: all 0.3s cubic-bezier(.4,0,.2,1); }
        .card-hover:hover { transform: translateY(-4px); box-shadow: 0 20px 40px rgba(0,0,0,.12); }
      `}</style>

      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
        <Navbar />

        {/* ═══ HERO ══════════════════════════════════════════════════════════ */}
        <section className="relative bg-black text-white overflow-hidden" style={{ minHeight: 340 }}>
          <DotBg />
          {/* Decorative orbs */}
          <div className="absolute top-8 right-32 w-72 h-72 rounded-full bg-white/5 blur-3xl"
               style={{ animation: "orb1 8s ease-in-out infinite" }} />
          <div className="absolute -bottom-20 left-20 w-56 h-56 rounded-full bg-white/5 blur-3xl"
               style={{ animation: "orb2 10s ease-in-out infinite" }} />
          {/* Concentric rings */}
          <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-[500px] h-[500px] rounded-full border border-white/5" />
          <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-[350px] h-[350px] rounded-full border border-white/5" />

          <div className="relative max-w-7xl mx-auto px-6 py-14 flex flex-col md:flex-row items-center gap-10">
            {/* Left copy */}
            <div className="flex-1 float-in">
              <span className="inline-flex items-center gap-2 text-xs font-semibold tracking-widest uppercase bg-white/10 border border-white/15 rounded-full px-4 py-1.5 mb-5">
                <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                Client Dashboard
              </span>
              <h1 className="text-5xl md:text-6xl font-black leading-[1.1] mb-4">
                Hello,<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">
                  {name}
                </span>
              </h1>
              <p className="text-gray-400 mb-7 text-lg max-w-md">
                Post gigs, manage freelancers, and resolve disputes — all on-chain.
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => navigate("/customer-jobs")}
                  className="px-7 py-3 bg-white text-black font-bold rounded-2xl hover:bg-gray-100 transition-all hover:scale-105 shadow-lg"
                >
                  💼 Manage Jobs
                </button>
                <button
                  onClick={() => navigate("/home")}
                  className="px-7 py-3 bg-white/10 border border-white/20 text-white font-bold rounded-2xl hover:bg-white/15 transition-all"
                >
                  Browse Feed
                </button>
              </div>
            </div>

            {/* Right stat cards */}
            <div className="grid grid-cols-2 gap-3 shrink-0 float-in" style={{ animationDelay: "0.15s" }}>
              {[
                { icon: "📋", label: "Total Posted", val: stats.total },
                { icon: "🔄", label: "Active",       val: stats.active },
                { icon: "✅", label: "Completed",    val: stats.completed },
                { icon: "⚖️", label: "Disputes",     val: stats.disputed },
              ].map(s => (
                <div key={s.label}
                  className="w-36 bg-white/8 border border-white/12 rounded-3xl p-5 backdrop-blur hover:bg-white/14 transition-all hover:scale-105 cursor-default"
                >
                  <div className="text-3xl mb-2">{s.icon}</div>
                  <div className="text-3xl font-black"><Counter value={s.val} /></div>
                  <div className="text-gray-400 text-xs uppercase tracking-widest mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ MAIN CONTENT ══════════════════════════════════════════════════ */}
        <div className="max-w-7xl mx-auto px-6 py-10 space-y-12">

          {/* ── QUICK ACTIONS ───────────────────────────────────────────── */}
          <section className="float-in" style={{ animationDelay: "0.2s" }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-black text-black dark:text-white">Quick Actions</h2>
              <div className="h-px flex-1 bg-gray-200 dark:bg-white/10 ml-6" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { icon: "➕", label: "Post New Gig",   desc: "Create a job listing",     action: () => navigate("/customer-jobs"), primary: true },
                { icon: "📁", label: "My Jobs",         desc: "View & manage all jobs",   action: () => navigate("/customer-jobs"), primary: false },
                { icon: "⚖️", label: "Disputes",        desc: "Resolve active conflicts", action: () => navigate("/ResolutionCenter"), primary: false },
                { icon: "👤", label: "My Profile",      desc: "Update your details",      action: () => navigate("/clientprofile"), primary: false },
              ].map(a => (
                <button key={a.label} onClick={a.action}
                  className={`rounded-3xl p-6 text-left card-hover shadow-sm group
                    ${a.primary
                      ? "bg-black dark:bg-white text-white dark:text-black"
                      : "bg-white dark:bg-white/6 text-black dark:text-white border-2 border-black dark:border-white/15"}`}
                >
                  <div className="text-3xl mb-3 group-hover:scale-110 transition-transform">{a.icon}</div>
                  <div className="font-bold text-lg leading-tight">{a.label}</div>
                  <div className={`text-sm mt-1.5 ${a.primary ? "text-gray-400 dark:text-gray-600" : "text-gray-500 dark:text-white/40"}`}>
                    {a.desc}
                  </div>
                </button>
              ))}
            </div>
          </section>

          {/* ── RECENT JOBS CAROUSEL ────────────────────────────────────── */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-black text-black dark:text-white">Recent Jobs</h2>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => carouselRef.current?.scrollBy({ left: -280, behavior: "smooth" })}
                  className="w-9 h-9 rounded-full border-2 border-black flex items-center justify-center font-bold hover:bg-black hover:text-white transition-all"
                >‹</button>
                <button
                  onClick={() => carouselRef.current?.scrollBy({ left: 280, behavior: "smooth" })}
                  className="w-9 h-9 rounded-full border-2 border-black flex items-center justify-center font-bold hover:bg-black hover:text-white transition-all"
                >›</button>
                <button onClick={() => navigate("/customer-jobs")}
                  className="text-sm font-semibold text-gray-400 hover:text-black transition-colors ml-2">
                  View all →
                </button>
              </div>
            </div>

            {jobs.length === 0 ? (
              <div className="bg-white rounded-3xl border-2 border-dashed border-gray-200 py-20 text-center">
                <div className="text-7xl mb-4">📋</div>
                <p className="text-xl font-bold text-black mb-2">No jobs yet</p>
                <p className="text-gray-400 mb-6 text-sm">Post your first gig and find the perfect freelancer</p>
                <button onClick={() => navigate("/customer-jobs")}
                  className="px-8 py-3 bg-black text-white rounded-2xl font-bold hover:bg-gray-800 transition-all hover:scale-105">
                  Post a Gig
                </button>
              </div>
            ) : (
              <div ref={carouselRef}
                className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-none"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
              >
                {jobs.map(job => (
                  <div key={job._id}
                    className="min-w-[280px] max-w-[280px] bg-white rounded-3xl border border-gray-100 p-6 card-hover snap-start group flex flex-col"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-10 h-10 rounded-2xl bg-black text-white flex items-center justify-center text-lg font-black shrink-0">
                        {job.gigNumber || "#"}
                      </div>
                      <span className={`text-xs font-bold px-3 py-1 rounded-full ${STATUS_STYLES[job.status] || "bg-gray-100 text-gray-600"}`}>
                        {job.status}
                      </span>
                    </div>
                    <h3 className="font-bold text-black text-base mt-3 leading-snug line-clamp-2">{job.title}</h3>
                    <p className="text-gray-400 text-sm mt-1.5 line-clamp-2 flex-1">{job.content}</p>
                    <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                      <span className="font-black text-black">{job.srtAmount || 0} <span className="text-gray-400 font-normal text-xs">SRT</span></span>
                      <button
                        onClick={() => navigate("/customer-jobs")}
                        className="text-xs font-bold px-4 py-2 bg-black text-white rounded-xl opacity-0 group-hover:opacity-100 transition-all"
                      >
                        Manage →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ── PLATFORM FEATURES ───────────────────────────────────────── */}
          <section className="relative bg-black text-white rounded-[2rem] p-10 overflow-hidden">
            <DotBg />
            <div className="relative">
              <p className="text-xs font-bold tracking-[0.3em] uppercase text-gray-500 mb-2">Why SwaRojgar</p>
              <h2 className="text-3xl font-black mb-10">Built for Trust</h2>
              <div className="grid md:grid-cols-3 gap-8">
                {[
                  { icon: "🔐", title: "Trustless Escrow",  desc: "SRT tokens locked in a smart contract. Released only on mutual approval — zero middlemen." },
                  { icon: "🤖", title: "AI Arbitration",    desc: "GPT-4 powered first-pass dispute resolution with transparent, unbiased verdicts." },
                  { icon: "⚖️", title: "Kleros Court",      desc: "Decentralized juror-based arbitration via ERC-792 — the final, immutable fallback." },
                ].map(f => (
                  <div key={f.title} className="bg-white/5 rounded-2xl p-6 border border-white/8 hover:bg-white/10 transition-all card-hover">
                    <div className="text-4xl mb-4">{f.icon}</div>
                    <h3 className="font-bold text-lg mb-2">{f.title}</h3>
                    <p className="text-gray-400 text-sm leading-relaxed">{f.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── STATS BREAKDOWN ─────────────────────────────────────────── */}
          <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Total Posted",   val: stats.total,     icon: "📋", sub: "all time" },
              { label: "Active Now",     val: stats.active,    icon: "🔄", sub: "in progress" },
              { label: "Completed",      val: stats.completed, icon: "✅", sub: "successful" },
              { label: "In Dispute",     val: stats.disputed,  icon: "⚖️", sub: "under review" },
            ].map(s => (
              <div key={s.label}
                className="bg-white dark:bg-white/5 rounded-3xl border border-gray-100 dark:border-white/8 p-6 card-hover text-center"
              >
                <div className="text-3xl mb-3">{s.icon}</div>
                <div className="text-4xl font-black text-black dark:text-white"><Counter value={s.val} /></div>
                <div className="font-semibold text-black dark:text-white/80 mt-1 text-sm">{s.label}</div>
                <div className="text-gray-400 dark:text-white/30 text-xs mt-0.5">{s.sub}</div>
              </div>
            ))}
          </section>

        </div>
      </div>
    </>
  );
}
