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

/* ─── Animated counter ───────────────────────────────────────────────────── */
function Counter({ value }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!value) return;
    let cur = 0;
    const step = Math.max(1, Math.floor(value / 40));
    const t = setInterval(() => {
      cur = Math.min(cur + step, value);
      setN(cur);
      if (cur >= value) clearInterval(t);
    }, 30);
    return () => clearInterval(t);
  }, [value]);
  return <>{n}</>;
}

/* ─── Status badge styles ────────────────────────────────────────────────── */
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
export default function FreelancerDashboard() {
  const navigate = useNavigate();
  const carouselRef    = useRef(null);
  const availRef       = useRef(null);

  const [user, setUser]           = useState(null);
  const [myGigs, setMyGigs]       = useState([]);
  const [available, setAvailable] = useState([]);
  const [loading, setLoading]     = useState(true);

  const userId = localStorage.getItem("userId");
  const token  = localStorage.getItem("token");

  useEffect(() => {
    if (!userId || !token) { navigate("/login"); return; }
    Promise.all([
      fetch(`${API_URL}/api/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(r => r.json()),
      fetch(`${API_URL}/api/jobs/freelancer/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(r => r.json()),
      fetch(`${API_URL}/api/jobs/available`).then(r => r.json()),
    ])
      .then(([u, mine, avail]) => {
        setUser(u);
        setMyGigs(Array.isArray(mine) ? mine : []);
        setAvailable(Array.isArray(avail) ? avail : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const stats = {
    active:    myGigs.filter(g => ["ASSIGNED", "PROOF_SUBMITTED"].includes(g.status)).length,
    completed: myGigs.filter(g => g.status === "COMPLETED").length,
    pending:   myGigs.filter(g => g.status === "PROOF_SUBMITTED").length,
    disputed:  myGigs.filter(g => (g.status || "").includes("DISPUTED")).length,
    earned:    myGigs.filter(g => g.status === "COMPLETED").reduce((s, g) => s + (g.srtAmount || 0), 0),
  };

  const name = user?.firstName || localStorage.getItem("firstName") || "Freelancer";

  if (loading) return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center flex-col gap-4">
      <div className="w-14 h-14 rounded-full border-4 border-black dark:border-white border-t-transparent animate-spin" />
      <p className="text-xs font-bold tracking-[0.3em] uppercase text-gray-400 dark:text-gray-500">Loading Dashboard</p>
    </div>
  );

  return (
    <>
      <style>{`
        @keyframes floatUp { from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)} }
        @keyframes spin1 { 0%,100%{transform:rotate(0deg) translate(0,0)}50%{transform:rotate(8deg) translate(15px,-10px)} }
        .float-in { animation: floatUp 0.6s ease both; }
        .card-hover { transition:all 0.3s cubic-bezier(.4,0,.2,1); }
        .card-hover:hover { transform:translateY(-4px); box-shadow:0 20px 40px rgba(0,0,0,.12); }
        .scrollbar-none::-webkit-scrollbar { display:none; }
      `}</style>

      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
        <Navbar />

        {/* ═══ HERO ══════════════════════════════════════════════════════════ */}
        <section className="relative bg-black text-white overflow-hidden" style={{ minHeight: 340 }}>
          <DotBg />
          <div className="absolute top-6 right-24 w-80 h-80 rounded-full bg-white/4 blur-3xl"
               style={{ animation: "spin1 9s ease-in-out infinite" }} />
          <div className="absolute -bottom-16 -left-10 w-64 h-64 rounded-full border border-white/6 animate-pulse" />
          <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-[480px] h-[480px] rounded-full border border-white/5" />
          <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-[300px] h-[300px] rounded-full border border-white/5" />

          <div className="relative max-w-7xl mx-auto px-6 py-14 flex flex-col md:flex-row items-center gap-10">
            <div className="flex-1 float-in">
              <span className="inline-flex items-center gap-2 text-xs font-semibold tracking-widest uppercase bg-white/10 border border-white/15 rounded-full px-4 py-1.5 mb-5">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                Freelancer Dashboard
              </span>
              <h1 className="text-5xl md:text-6xl font-black leading-[1.1] mb-4">
                Ready to work,<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">
                  {name}?
                </span>
              </h1>
              <p className="text-gray-400 mb-7 text-lg max-w-md">
                Browse gigs, submit proof of work, and get paid — instantly, on-chain.
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => navigate("/freelancer-jobs")}
                  className="px-7 py-3 bg-white text-black font-bold rounded-2xl hover:bg-gray-100 transition-all hover:scale-105 shadow-lg"
                >
                  💼 My Gigs
                </button>
                <button
                  onClick={() => navigate("/home")}
                  className="px-7 py-3 bg-white/10 border border-white/20 text-white font-bold rounded-2xl hover:bg-white/15 transition-all"
                >
                  Browse Jobs
                </button>
              </div>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-2 gap-3 shrink-0 float-in" style={{ animationDelay: "0.15s" }}>
              {[
                { icon: "⚡", label: "Active Gigs",   val: stats.active },
                { icon: "✅", label: "Completed",     val: stats.completed },
                { icon: "💰", label: "Earned (SRT)",  val: stats.earned },
                { icon: "⏳", label: "Pending Review", val: stats.pending },
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

        <div className="max-w-7xl mx-auto px-6 py-10 space-y-12">

          {/* ── QUICK ACTIONS ─────────────────────────────────────────────── */}
          <section className="float-in" style={{ animationDelay: "0.2s" }}>
            <div className="flex items-center gap-4 mb-6">
              <h2 className="text-2xl font-black text-black dark:text-white shrink-0">Quick Actions</h2>
              <div className="h-px flex-1 bg-gray-200 dark:bg-white/10" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { icon: "🔍", label: "Browse Jobs",    desc: "Find new gigs to apply",      primary: true,  action: () => navigate("/freelancer-jobs") },
                { icon: "📁", label: "My Gigs",        desc: "View assigned work",           primary: false, action: () => navigate("/freelancer-jobs") },
                { icon: "📤", label: "Submit Work",    desc: "Upload proof of completion",   primary: false, action: () => navigate("/work-submission") },
                { icon: "👤", label: "My Profile",     desc: "Update skills & portfolio",    primary: false, action: () => navigate("/profile") },
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

          {/* ── MY ACTIVE GIGS CAROUSEL ───────────────────────────────────── */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-black text-black dark:text-white">My Active Gigs</h2>
              <div className="flex items-center gap-3">
                <button onClick={() => carouselRef.current?.scrollBy({ left: -280, behavior: "smooth" })}
                  className="w-9 h-9 rounded-full border-2 border-black flex items-center justify-center font-bold hover:bg-black hover:text-white transition-all">‹</button>
                <button onClick={() => carouselRef.current?.scrollBy({ left: 280, behavior: "smooth" })}
                  className="w-9 h-9 rounded-full border-2 border-black flex items-center justify-center font-bold hover:bg-black hover:text-white transition-all">›</button>
                <button onClick={() => navigate("/freelancer-jobs")}
                  className="text-sm font-semibold text-gray-400 hover:text-black transition-colors ml-2">
                  View all →
                </button>
              </div>
            </div>

            {myGigs.length === 0 ? (
              <div className="bg-white rounded-3xl border-2 border-dashed border-gray-200 py-16 text-center">
                <div className="text-7xl mb-4">💼</div>
                <p className="text-xl font-bold text-black mb-2">No gigs assigned yet</p>
                <p className="text-gray-400 mb-6 text-sm">Browse available jobs and start applying</p>
                <button onClick={() => navigate("/freelancer-jobs")}
                  className="px-8 py-3 bg-black text-white rounded-2xl font-bold hover:bg-gray-800 transition-all hover:scale-105">
                  Find Work
                </button>
              </div>
            ) : (
              <div ref={carouselRef}
                className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-none"
                style={{ scrollbarWidth: "none" }}
              >
                {myGigs.map(gig => (
                  <div key={gig._id}
                    className="min-w-[280px] max-w-[280px] bg-white rounded-3xl border border-gray-100 p-6 card-hover snap-start group flex flex-col"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-10 h-10 rounded-2xl bg-black text-white flex items-center justify-center text-lg font-black shrink-0">
                        {gig.gigNumber || "#"}
                      </div>
                      <span className={`text-xs font-bold px-3 py-1 rounded-full ${STATUS_STYLES[gig.status] || "bg-gray-100 text-gray-600"}`}>
                        {gig.status}
                      </span>
                    </div>
                    <h3 className="font-bold text-black text-base mt-3 leading-snug line-clamp-2">{gig.title}</h3>
                    <p className="text-gray-400 text-sm mt-1.5 line-clamp-2 flex-1">{gig.content}</p>
                    <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                      <span className="font-black text-black">{gig.srtAmount || 0} <span className="text-gray-400 font-normal text-xs">SRT</span></span>
                      {gig.status === "ASSIGNED" && (
                        <button
                          onClick={() => navigate("/work-submission", { state: { gigId: gig._id } })}
                          className="text-xs font-bold px-4 py-2 bg-black text-white rounded-xl opacity-0 group-hover:opacity-100 transition-all"
                        >
                          Submit →
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ── AVAILABLE JOBS CAROUSEL ───────────────────────────────────── */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-black text-black dark:text-white">Open Jobs</h2>
                <p className="text-gray-400 dark:text-white/40 text-sm mt-0.5">{available.length} gigs available right now</p>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => availRef.current?.scrollBy({ left: -280, behavior: "smooth" })}
                  className="w-9 h-9 rounded-full border-2 border-black flex items-center justify-center font-bold hover:bg-black hover:text-white transition-all">‹</button>
                <button onClick={() => availRef.current?.scrollBy({ left: 280, behavior: "smooth" })}
                  className="w-9 h-9 rounded-full border-2 border-black flex items-center justify-center font-bold hover:bg-black hover:text-white transition-all">›</button>
                <button onClick={() => navigate("/freelancer-jobs")}
                  className="text-sm font-semibold text-gray-400 hover:text-black transition-colors ml-2">
                  Browse all →
                </button>
              </div>
            </div>

            {available.length === 0 ? (
              <div className="bg-white rounded-3xl border border-gray-100 py-12 text-center">
                <div className="text-5xl mb-3">🔍</div>
                <p className="text-gray-400">No open jobs at the moment — check back soon</p>
              </div>
            ) : (
              <div ref={availRef}
                className="flex gap-4 overflow-x-auto pb-2 snap-x scrollbar-none"
                style={{ scrollbarWidth: "none" }}
              >
                {available.slice(0, 10).map(job => (
                  <div key={job._id}
                    className="min-w-[300px] max-w-[300px] bg-white rounded-3xl border border-gray-100 p-6 card-hover snap-start group flex flex-col relative overflow-hidden"
                  >
                    {/* Subtle corner decoration */}
                    <div className="absolute top-0 right-0 w-20 h-20 bg-gray-50 rounded-bl-3xl" />
                    <div className="relative">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 rounded-xl bg-black text-white flex items-center justify-center text-xs font-black">
                          {job.gigNumber || "?"}
                        </div>
                        <span className="text-xs text-gray-400 font-medium">
                          {job.userId?.firstName || "Client"}
                        </span>
                      </div>
                      <h3 className="font-bold text-black text-base leading-snug line-clamp-2 mb-2">{job.title}</h3>
                      <p className="text-gray-400 text-xs line-clamp-3 flex-1">{job.content}</p>
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                      <div>
                        <span className="font-black text-black text-lg">{job.srtAmount || 0}</span>
                        <span className="text-gray-400 text-xs ml-1">SRT</span>
                      </div>
                      <button
                        onClick={() => navigate("/freelancer-jobs")}
                        className="text-xs font-bold px-4 py-2 bg-black text-white rounded-xl opacity-0 group-hover:opacity-100 transition-all"
                      >
                        Apply →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ── EARNINGS OVERVIEW ────────────────────────────────────────── */}
          <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: "⚡", label: "Active Gigs",   val: stats.active,    sub: "in progress",   dark: true },
              { icon: "✅", label: "Completed",     val: stats.completed, sub: "total",          dark: false },
              { icon: "💰", label: "SRT Earned",    val: stats.earned,    sub: "all time",       dark: false },
              { icon: "⚖️", label: "Disputes",      val: stats.disputed,  sub: "under review",   dark: false },
            ].map(s => (
              <div key={s.label}
                className={`rounded-3xl p-6 card-hover text-center
                  ${s.dark
                    ? "bg-black dark:bg-white/8 text-white"
                    : "bg-white dark:bg-white/5 border border-gray-100 dark:border-white/8 text-black dark:text-white"}`}
              >
                <div className="text-3xl mb-3">{s.icon}</div>
                <div className="text-4xl font-black"><Counter value={s.val} /></div>
                <div className={`font-semibold text-sm mt-1 ${s.dark ? "text-gray-300" : "text-black dark:text-white/80"}`}>{s.label}</div>
                <div className={`text-xs mt-0.5 ${s.dark ? "text-gray-500" : "text-gray-400 dark:text-white/30"}`}>{s.sub}</div>
              </div>
            ))}
          </section>

          {/* ── HOW IT WORKS ────────────────────────────────────────────── */}
          <section className="relative bg-black text-white rounded-[2rem] p-10 overflow-hidden">
            <DotBg />
            <div className="relative">
              <p className="text-xs font-bold tracking-[0.3em] uppercase text-gray-500 mb-2">How it works</p>
              <h2 className="text-3xl font-black mb-10">Get paid in 4 steps</h2>
              <div className="grid md:grid-cols-4 gap-6">
                {[
                  { num: "01", title: "Browse & Apply",    desc: "Find a gig that matches your skills and apply on-chain." },
                  { num: "02", title: "Get Assigned",      desc: "Client locks SRT in escrow and assigns the gig to you." },
                  { num: "03", title: "Submit Proof",      desc: "Upload your work to IPFS and submit the hash on-chain." },
                  { num: "04", title: "Get Paid",          desc: "Client approves and 98% of SRT releases to your wallet." },
                ].map(s => (
                  <div key={s.num} className="bg-white/5 border border-white/8 rounded-2xl p-5 hover:bg-white/10 transition-all card-hover">
                    <div className="text-4xl font-black text-gray-700 mb-3">{s.num}</div>
                    <h3 className="font-bold mb-2">{s.title}</h3>
                    <p className="text-gray-400 text-sm leading-relaxed">{s.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

        </div>
      </div>
    </>
  );
}
