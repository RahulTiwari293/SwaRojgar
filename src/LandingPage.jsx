/**
 * LandingPage.jsx — SwaRojgar Landing Page
 *
 * Sections:
 *  A. Navbar (sticky, dark/light toggle, wallet CTA)
 *  B. Hero (animated SVG nodes bg, two CTAs)
 *  C. Features (3 cards with hover effects)
 *  D. How It Works (5-step timeline)
 *  E. Kleros Trust Section
 *  F. Final CTA banner
 *  G. Footer
 */

import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

// ─── Animated Background (SVG nodes / constellation) ─────────────────────────
function NodeCanvas() {
    const canvasRef = useRef(null);
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        let W = canvas.width  = canvas.offsetWidth;
        let H = canvas.height = canvas.offsetHeight;
        const N = 60;
        const CONNECT_DIST = 140;

        const nodes = Array.from({ length: N }, () => ({
            x: Math.random() * W,
            y: Math.random() * H,
            vx: (Math.random() - 0.5) * 0.3,
            vy: (Math.random() - 0.5) * 0.3,
            r: Math.random() * 2 + 1
        }));

        let raf;
        const draw = () => {
            ctx.clearRect(0, 0, W, H);
            // Move
            nodes.forEach(n => {
                n.x += n.vx; n.y += n.vy;
                if (n.x < 0 || n.x > W) n.vx *= -1;
                if (n.y < 0 || n.y > H) n.vy *= -1;
            });
            // Connections
            for (let i = 0; i < N; i++) {
                for (let j = i + 1; j < N; j++) {
                    const dx = nodes[i].x - nodes[j].x;
                    const dy = nodes[i].y - nodes[j].y;
                    const d  = Math.sqrt(dx*dx + dy*dy);
                    if (d < CONNECT_DIST) {
                        const alpha = (1 - d / CONNECT_DIST) * 0.25;
                        ctx.strokeStyle = `rgba(139, 92, 246, ${alpha})`;
                        ctx.lineWidth = 0.8;
                        ctx.beginPath();
                        ctx.moveTo(nodes[i].x, nodes[i].y);
                        ctx.lineTo(nodes[j].x, nodes[j].y);
                        ctx.stroke();
                    }
                }
            }
            // Dots
            nodes.forEach(n => {
                ctx.beginPath();
                ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
                ctx.fillStyle = "rgba(167, 139, 250, 0.5)";
                ctx.fill();
            });
            raf = requestAnimationFrame(draw);
        };
        draw();

        const onResize = () => {
            W = canvas.width  = canvas.offsetWidth;
            H = canvas.height = canvas.offsetHeight;
        };
        window.addEventListener("resize", onResize);
        return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", onResize); };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full opacity-60"
        />
    );
}

// ─── Section fade-in hook ─────────────────────────────────────────────────────
function useFadeIn() {
    const ref = useRef(null);
    const [visible, setVisible] = useState(false);
    useEffect(() => {
        const obs = new IntersectionObserver(
            ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
            { threshold: 0.12 }
        );
        if (ref.current) obs.observe(ref.current);
        return () => obs.disconnect();
    }, []);
    return [ref, visible];
}

// ─── Feature Card ─────────────────────────────────────────────────────────────
function FeatureCard({ icon, title, desc, accent }) {
    const [ref, vis] = useFadeIn();
    return (
        <div
            ref={ref}
            className={`group relative rounded-3xl border bg-white/4 backdrop-blur-sm p-8 transition-all duration-700 hover:scale-[1.03] hover:shadow-2xl cursor-default
                ${vis ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}
                ${accent === "violet" ? "border-violet-500/20 hover:border-violet-500/50 hover:shadow-violet-500/10" :
                  accent === "cyan"   ? "border-cyan-500/20   hover:border-cyan-500/50   hover:shadow-cyan-500/10"   :
                                        "border-emerald-500/20 hover:border-emerald-500/50 hover:shadow-emerald-500/10"}
            `}
        >
            {/* Glow blob */}
            <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-0 group-hover:opacity-30 transition-opacity duration-500
                ${accent === "violet" ? "bg-violet-500" : accent === "cyan" ? "bg-cyan-500" : "bg-emerald-500"}`} />

            <div className={`text-4xl mb-5 w-14 h-14 flex items-center justify-center rounded-2xl
                ${accent === "violet" ? "bg-violet-500/15 border border-violet-500/20" :
                  accent === "cyan"   ? "bg-cyan-500/15 border border-cyan-500/20"     :
                                        "bg-emerald-500/15 border border-emerald-500/20"}`}>
                {icon}
            </div>
            <h3 className="text-white font-bold text-xl mb-3">{title}</h3>
            <p className="text-white/55 text-sm leading-relaxed">{desc}</p>
        </div>
    );
}

// ─── Timeline Step ────────────────────────────────────────────────────────────
function Step({ num, title, desc, icon, last }) {
    const [ref, vis] = useFadeIn();
    return (
        <div
            ref={ref}
            className={`relative flex gap-6 transition-all duration-700 ${vis ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-8"}`}
            style={{ transitionDelay: `${num * 100}ms` }}
        >
            {/* Line */}
            <div className="flex flex-col items-center">
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-violet-600 to-cyan-600 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-lg shadow-violet-500/30">
                    {icon}
                </div>
                {!last && <div className="w-0.5 flex-1 bg-gradient-to-b from-violet-500/40 to-transparent mt-2 min-h-[40px]" />}
            </div>
            <div className="pb-10">
                <div className="flex items-center gap-2 mb-1">
                    <span className="text-violet-400 text-xs font-bold tracking-widest uppercase">Step {num}</span>
                </div>
                <h4 className="text-white font-bold text-lg mb-1">{title}</h4>
                <p className="text-white/50 text-sm leading-relaxed max-w-lg">{desc}</p>
            </div>
        </div>
    );
}

// ─── Stat Ticker ──────────────────────────────────────────────────────────────
function StatCard({ value, label }) {
    return (
        <div className="text-center">
            <p className="text-4xl font-black bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">{value}</p>
            <p className="text-white/40 text-sm mt-1">{label}</p>
        </div>
    );
}

// ─── MAIN LANDING PAGE ────────────────────────────────────────────────────────
export default function LandingPage() {
    const navigate  = useNavigate();
    const [dark,    setDark]    = useState(true);
    const [menuOpen,setMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 40);
        window.addEventListener("scroll", onScroll);
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    const scrollTo = (id) => {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
        setMenuOpen(false);
    };

    // Apply dark class to root for Tailwind dark mode
    useEffect(() => {
        document.documentElement.classList.toggle("dark", dark);
    }, [dark]);

    const bg   = dark ? "bg-[#070711]" : "bg-slate-50";
    const text  = dark ? "text-white"   : "text-slate-900";
    const sub   = dark ? "text-white/50" : "text-slate-500";

    return (
        <div className={`${bg} ${text} min-h-screen font-sans antialiased transition-colors duration-300`}>

            {/* ═══════════════════════════════════════════════
                A. NAVBAR
            ════════════════════════════════════════════════ */}
            <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300
                ${scrolled
                    ? dark ? "bg-[#070711]/90 backdrop-blur-xl border-b border-white/8 shadow-2xl shadow-black/30"
                           : "bg-white/90 backdrop-blur-xl border-b border-slate-200 shadow-lg"
                    : "bg-transparent"}`}
            >
                <div className="max-w-7xl mx-auto px-5 h-16 flex items-center gap-6">
                    {/* Logo */}
                    <button onClick={() => scrollTo("hero")} className="flex items-center gap-2.5 shrink-0">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-cyan-600 flex items-center justify-center text-white font-black text-sm">
                            SR
                        </div>
                        <span className="font-black text-lg tracking-tight bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
                            SwaRojgar
                        </span>
                    </button>

                    {/* Desktop Nav */}
                    <nav className="hidden md:flex items-center gap-1 flex-1 justify-center">
                        {[["Features","features"],["How It Works","howitworks"],["Kleros Justice","kleros"]].map(([l,id]) => (
                            <button key={id} onClick={() => scrollTo(id)}
                                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${dark ? "text-white/55 hover:text-white hover:bg-white/8" : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"}`}>
                                {l}
                            </button>
                        ))}
                    </nav>

                    <div className="flex items-center gap-3 ml-auto">
                        {/* Theme toggle */}
                        <button
                            onClick={() => setDark(d => !d)}
                            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${dark ? "bg-white/8 text-yellow-300 hover:bg-white/14" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
                            aria-label="Toggle theme"
                        >
                            {dark ? "☀️" : "🌙"}
                        </button>

                        {/* Login */}
                        <button onClick={() => navigate("/login")}
                            className={`hidden md:block px-4 py-2 rounded-xl text-sm font-semibold transition-all ${dark ? "text-white/60 hover:text-white hover:bg-white/8" : "text-slate-600 hover:bg-slate-100"}`}>
                            Log In
                        </button>

                        {/* CTA */}
                        <button onClick={() => navigate("/signup")}
                            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white text-sm font-bold transition-all shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:scale-105">
                            Get Started →
                        </button>

                        {/* Hamburger */}
                        <button onClick={() => setMenuOpen(m => !m)} className="md:hidden p-2">
                            <div className={`space-y-1.5 ${menuOpen ? "opacity-70" : ""}`}>
                                <span className={`block w-5 h-0.5 ${dark ? "bg-white" : "bg-slate-800"} transition-transform ${menuOpen ? "rotate-45 translate-y-2" : ""}`}/>
                                <span className={`block w-5 h-0.5 ${dark ? "bg-white" : "bg-slate-800"} transition-opacity ${menuOpen ? "opacity-0" : ""}`}/>
                                <span className={`block w-5 h-0.5 ${dark ? "bg-white" : "bg-slate-800"} transition-transform ${menuOpen ? "-rotate-45 -translate-y-2" : ""}`}/>
                            </div>
                        </button>
                    </div>
                </div>

                {/* Mobile menu */}
                {menuOpen && (
                    <div className={`md:hidden px-5 pb-5 space-y-1 ${dark ? "bg-[#070711]/95" : "bg-white/95"}`}>
                        {[["Features","features"],["How It Works","howitworks"],["Kleros Justice","kleros"]].map(([l,id]) => (
                            <button key={id} onClick={() => scrollTo(id)}
                                className={`block w-full text-left px-4 py-3 rounded-xl text-sm font-medium ${dark ? "text-white/70 hover:bg-white/8" : "text-slate-700 hover:bg-slate-100"}`}>
                                {l}
                            </button>
                        ))}
                        <button onClick={() => navigate("/login")} className={`block w-full text-left px-4 py-3 rounded-xl text-sm font-medium ${dark ? "text-white/70 hover:bg-white/8" : "text-slate-700 hover:bg-slate-100"}`}>
                            Log In
                        </button>
                    </div>
                )}
            </header>

            {/* ═══════════════════════════════════════════════
                B. HERO
            ════════════════════════════════════════════════ */}
            <section id="hero" className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden pt-16">
                {/* Animated canvas */}
                <NodeCanvas />

                {/* Radial gradients */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-violet-600/12 rounded-full blur-3xl"/>
                    <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-cyan-500/8 rounded-full blur-3xl"/>
                </div>

                <div className="relative z-10 max-w-4xl mx-auto px-5 text-center">
                    {/* Eyebrow badge */}
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-violet-500/25 bg-violet-500/8 text-violet-400 text-xs font-semibold mb-8 backdrop-blur-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse"/>
                        Powered by Kleros · ERC-792/1497 · Ethereum Sepolia
                    </div>

                    {/* Headline */}
                    <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black leading-[1.05] tracking-tight mb-6">
                        Freelance with{" "}
                        <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-400 bg-clip-text text-transparent">
                            Confidence.
                        </span>
                        <br />
                        <span className="text-white/80">Secured by Code,</span>
                        <br />
                        <span className={`${dark ? "text-white/40" : "text-slate-400"} text-4xl sm:text-5xl lg:text-6xl`}>Arbitrated by Humanity.</span>
                    </h1>

                    {/* Sub */}
                    <p className={`${sub} text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed`}>
                        The decentralized gig platform with <span className={dark?"text-violet-400":"text-violet-600"}>AI-powered</span> and{" "}
                        <span className={dark?"text-cyan-400":"text-cyan-600"}>Kleros decentralized justice</span> — so you always get what you were promised.
                    </p>

                    {/* CTAs */}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <button
                            onClick={() => navigate("/login")}
                            className="group flex items-center gap-3 px-7 py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white font-bold text-base transition-all shadow-xl shadow-violet-500/30 hover:shadow-violet-500/50 hover:scale-105"
                        >
                            💼 Hire a Professional
                            <span className="transition-transform group-hover:translate-x-1">→</span>
                        </button>
                        <button
                            onClick={() => navigate("/signup")}
                            className={`flex items-center gap-3 px-7 py-4 rounded-2xl font-bold text-base transition-all border hover:scale-105
                                ${dark ? "border-white/15 text-white/80 hover:bg-white/8 hover:border-white/30" : "border-slate-200 text-slate-700 hover:bg-slate-100"}`}
                        >
                            🚀 Find Work
                        </button>
                    </div>

                    {/* Social proof */}
                    <div className="flex items-center justify-center gap-8 mt-14 flex-wrap">
                        <StatCard value="100%" label="On-chain escrow" />
                        <div className={`w-px h-10 ${dark ? "bg-white/10" : "bg-slate-200"}`}/>
                        <StatCard value="3-Tier" label="Dispute resolution" />
                        <div className={`w-px h-10 ${dark ? "bg-white/10" : "bg-slate-200"}`}/>
                        <StatCard value="0%" label="Hidden fees" />
                    </div>
                </div>

                {/* Scroll hint */}
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce">
                    <div className={`w-px h-10 ${dark ? "bg-gradient-to-b from-white/30 to-transparent" : "bg-gradient-to-b from-slate-400/50 to-transparent"}`}/>
                </div>
            </section>

            {/* ═══════════════════════════════════════════════
                C. FEATURES
            ════════════════════════════════════════════════ */}
            <section id="features" className={`py-28 px-5 ${dark ? "" : "bg-white"}`}>
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-16">
                        <p className="text-violet-400 text-xs font-bold tracking-[0.3em] uppercase mb-3">The Unfair Advantage</p>
                        <h2 className="text-4xl sm:text-5xl font-black mb-4">
                            Built different.{" "}
                            <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
                                Secured by math.
                            </span>
                        </h2>
                        <p className={`${sub} max-w-xl mx-auto`}>
                            Other platforms promise fairness. We encode it into a smart contract.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <FeatureCard
                            accent="violet"
                            icon="🔒"
                            title="Smart Escrow Protection"
                            desc="Funds lock in an audited Solidity contract the moment a gig is created. Nobody — not even us — can touch them before both parties agree. Code is law."
                        />
                        <FeatureCard
                            accent="cyan"
                            icon="⚖️"
                            title="3-Tier Justice System"
                            desc="Disputes escalate through AI analysis (GPT-4), then Kleros decentralized court (real jurors, real stakes), then a human multisig as the final fail-safe. Trustless by design."
                        />
                        <FeatureCard
                            accent="emerald"
                            icon="🌐"
                            title="Zero Bureaucracy"
                            desc="No banks. No wire transfers. No identity gatekeeping. Connect a wallet, get paid in SRT tokens. Instant settlement, global reach, 2% platform fee max."
                        />
                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════════════════════
                D. HOW IT WORKS
            ════════════════════════════════════════════════ */}
            <section id="howitworks" className={`py-28 px-5 ${dark ? "bg-white/[0.02]" : "bg-slate-50"}`}>
                <div className="max-w-3xl mx-auto">
                    <div className="text-center mb-16">
                        <p className="text-cyan-400 text-xs font-bold tracking-[0.3em] uppercase mb-3">The Process</p>
                        <h2 className="text-4xl sm:text-5xl font-black mb-4">
                            Five steps to{" "}
                            <span className="bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">
                                getting paid.
                            </span>
                        </h2>
                    </div>

                    <div>
                        <Step num={1} icon="📋" title="Post the Gig"
                            desc="Client describes the work, sets the budget in SRT tokens, and uploads the job to the blockchain-backed marketplace." />
                        <Step num={2} icon="🔒" title="Fund Escrow"
                            desc="Client approves the SRT token transfer. The smart contract locks funds — nobody can access them until the gig resolves." />
                        <Step num={3} icon="🚀" title="Freelancer Delivers"
                            desc="Freelancer submits proof-of-work: screenshots, deployed links, ZIP archives — all pinned to IPFS for immutable evidence." />
                        <Step num={4} icon="✅" title="Client Approves → Funds Released"
                            desc="One click. The smart contract transfers SRT to the freelancer instantly. No waiting, no bank delays." />
                        <Step num={5} icon="⚖️" title="Dispute? 3-Tier Resolution"
                            desc="Either party raises a dispute. AI reviews the case → Kleros jurors vote → Human admin as final backstop. Funds release per the verdict." last />
                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════════════════════
                E. KLEROS TRUST SECTION
            ════════════════════════════════════════════════ */}
            <section id="kleros" className="py-28 px-5">
                <div className="max-w-6xl mx-auto">
                    <div className={`relative rounded-3xl border overflow-hidden ${dark ? "border-white/8 bg-gradient-to-br from-violet-950/60 via-slate-950/80 to-cyan-950/40" : "border-slate-200 bg-gradient-to-br from-violet-50 via-white to-cyan-50"} p-10 sm:p-16`}>

                        {/* Background decoration */}
                        <div className="absolute top-0 right-0 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl pointer-events-none"/>
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-500/8 rounded-full blur-3xl pointer-events-none"/>

                        <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                            {/* Left text */}
                            <div>
                                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-bold mb-6">
                                    ⚖️ Kleros Integration · ERC-792/1497
                                </div>
                                <h2 className="text-4xl font-black mb-5">
                                    <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
                                        Decentralized Justice
                                    </span>{" "}
                                    <br />
                                    <span className={dark ? "text-white" : "text-slate-900"}>on every dispute.</span>
                                </h2>
                                <p className={`${sub} mb-6 leading-relaxed`}>
                                    When AI can't resolve a dispute and both parties disagree, the case goes to{" "}
                                    <strong className={dark ? "text-white" : "text-slate-900"}>Kleros Court</strong> — a decentralized protocol with{" "}
                                    over 800,000 PNK staked by incentivized jurors worldwide.
                                </p>
                                <ul className="space-y-3 mb-8">
                                    {[
                                        ["🧑‍⚖️", "Real jurors selected by sortition — no room for corruption"],
                                        ["🛡️", "Schelling point game theory ensures honest verdicts"],
                                        ["📄", "Evidence stored on IPFS per ERC-1497 standard"],
                                        ["⚡", "Smart contract enforces the verdict automatically"],
                                    ].map(([ic, t]) => (
                                        <li key={t} className={`flex items-start gap-3 text-sm ${sub}`}>
                                            <span className="text-base shrink-0">{ic}</span>
                                            <span>{t}</span>
                                        </li>
                                    ))}
                                </ul>
                                <a
                                    href="https://kleros.io"
                                    target="_blank" rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-violet-500/30 text-violet-400 hover:bg-violet-500/10 text-sm font-semibold transition-all"
                                >
                                    Learn about Kleros ↗
                                </a>
                            </div>

                            {/* Right: arbitation flow visual */}
                            <div className="flex flex-col gap-4">
                                {[
                                    { tier: "Tier 1", label: "AI Arbitrator", icon: "🤖", color: "orange", desc: "GPT-4 analyzes the brief and proof. Both parties vote to accept or reject." },
                                    { tier: "Tier 2", label: "Kleros Court", icon: "⚖️", color: "violet", desc: "3 randomly selected jurors review IPFS evidence. Schelling point voting determines the ruling." },
                                    { tier: "Tier 3", label: "Human Admin", icon: "👤", color: "pink", desc: "Platform multisig as the final fail-safe. Only triggered if Kleros refuses to arbitrate." },
                                ].map((t, i) => (
                                    <div key={i}
                                        className={`flex items-start gap-4 p-4 rounded-2xl border backdrop-blur-sm transition-all hover:scale-[1.02]
                                            ${t.color === "orange" ? "border-orange-500/20 bg-orange-500/6" :
                                              t.color === "violet" ? "border-violet-500/20 bg-violet-500/6" :
                                                                     "border-pink-500/20 bg-pink-500/6"}`}
                                    >
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0
                                            ${t.color === "orange" ? "bg-orange-500/15" : t.color === "violet" ? "bg-violet-500/15" : "bg-pink-500/15"}`}>
                                            {t.icon}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <span className={`text-xs font-bold ${t.color === "orange" ? "text-orange-400" : t.color === "violet" ? "text-violet-400" : "text-pink-400"}`}>
                                                    {t.tier}
                                                </span>
                                                <span className={`font-semibold text-sm ${dark ? "text-white" : "text-slate-800"}`}>{t.label}</span>
                                            </div>
                                            <p className={`text-xs leading-relaxed ${sub}`}>{t.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════════════════════
                F. FINAL CTA
            ════════════════════════════════════════════════ */}
            <section className="py-28 px-5">
                <div className="max-w-4xl mx-auto text-center">
                    <div className={`relative rounded-3xl border overflow-hidden px-8 py-20 ${dark ? "border-white/8 bg-gradient-to-br from-violet-600/15 via-transparent to-cyan-600/15" : "border-violet-200 bg-gradient-to-br from-violet-50 to-cyan-50"}`}>
                        <div className="absolute inset-0 pointer-events-none">
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-48 bg-violet-500/15 rounded-full blur-3xl"/>
                        </div>

                        <div className="relative">
                            <p className="text-violet-400 text-xs font-bold tracking-[0.3em] uppercase mb-4">The Future of Work</p>
                            <h2 className="text-4xl sm:text-6xl font-black mb-5 leading-tight">
                                Ready to join the{" "}
                                <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
                                    decentralized workforce?
                                </span>
                            </h2>
                            <p className={`${sub} text-lg max-w-xl mx-auto mb-10`}>
                                No banks. No borders. No broken promises. Just code, justice, and fair pay.
                            </p>
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                                <button
                                    onClick={() => navigate("/signup")}
                                    className="px-8 py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white font-bold text-lg shadow-2xl shadow-violet-500/30 hover:shadow-violet-500/50 hover:scale-105 transition-all"
                                >
                                    🚀 Join SwaRojgar Free →
                                </button>
                                <button
                                    onClick={() => scrollTo("howitworks")}
                                    className={`px-8 py-4 rounded-2xl border font-semibold text-base transition-all hover:scale-105 ${dark ? "border-white/15 text-white/70 hover:bg-white/8" : "border-slate-300 text-slate-700 hover:bg-slate-100"}`}
                                >
                                    See how it works
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════════════════════
                G. FOOTER
            ════════════════════════════════════════════════ */}
            <footer className={`border-t py-12 px-5 ${dark ? "border-white/6" : "border-slate-200"}`}>
                <div className="max-w-6xl mx-auto">
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-8 mb-10">
                        <div className="sm:col-span-2">
                            <div className="flex items-center gap-2 mb-3">
                                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-cyan-600 flex items-center justify-center text-white font-black text-sm">
                                    SR
                                </div>
                                <span className="font-black text-lg bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
                                    SwaRojgar
                                </span>
                            </div>
                            <p className={`${sub} text-sm leading-relaxed max-w-xs`}>
                                Decentralized freelancing secured by smart contracts and Kleros justice. The future of work is trustless.
                            </p>
                        </div>
                        <div>
                            <p className={`${dark ? "text-white" : "text-slate-900"} font-semibold text-sm mb-3`}>Platform</p>
                            <ul className={`space-y-2 text-sm ${sub}`}>
                                {["Browse Jobs","Post a Gig","Resolution Center","How It Works"].map(l => (
                                    <li key={l}><button onClick={() => navigate("/login")} className="hover:text-violet-400 transition-colors">{l}</button></li>
                                ))}
                            </ul>
                        </div>
                        <div>
                            <p className={`${dark ? "text-white" : "text-slate-900"} font-semibold text-sm mb-3`}>Technology</p>
                            <ul className={`space-y-2 text-sm ${sub}`}>
                                {[["Kleros Court","https://kleros.io"],["Ethereum Sepolia","https://sepolia.etherscan.io"],["IPFS / Pinata","https://pinata.cloud"],["ERC-792 Standard","https://github.com/kleros/kleros-interaction"]].map(([l,u]) => (
                                    <li key={l}><a href={u} target="_blank" rel="noopener noreferrer" className="hover:text-cyan-400 transition-colors">{l} ↗</a></li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    <div className={`border-t pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 ${dark ? "border-white/6" : "border-slate-200"}`}>
                        <p className={`text-xs ${sub}`}>© 2026 SwaRojgar. Built on Ethereum. Disputes resolved by Kleros.</p>
                        <div className="flex items-center gap-4">
                            <span className={`text-xs ${sub} flex items-center gap-1`}>
                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"/> Sepolia Testnet
                            </span>
                            <button
                                onClick={() => setDark(d => !d)}
                                className={`text-xs px-3 py-1.5 rounded-full border transition-all ${dark ? "border-white/10 text-white/40 hover:border-white/20" : "border-slate-200 text-slate-400 hover:bg-slate-100"}`}
                            >
                                {dark ? "☀️ Light mode" : "🌙 Dark mode"}
                            </button>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
