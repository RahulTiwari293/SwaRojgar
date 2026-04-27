/**
 * LandingPage.jsx — SwaRojgar Landing Page (Black & White Theme)
 */
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import logo from "./assets/logo.png";

// ─── Animated dot canvas ─────────────────────────────────────────────────────
function DotCanvas() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let W = canvas.width = canvas.offsetWidth;
    let H = canvas.height = canvas.offsetHeight;
    const N = 55, DIST = 130;
    const nodes = Array.from({ length: N }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.25, vy: (Math.random() - 0.5) * 0.25,
      r: Math.random() * 1.5 + 0.5,
    }));
    let raf;
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      nodes.forEach(n => {
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > W) n.vx *= -1;
        if (n.y < 0 || n.y > H) n.vy *= -1;
      });
      for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
        const dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < DIST) {
          ctx.strokeStyle = `rgba(255,255,255,${(1 - d / DIST) * 0.15})`;
          ctx.lineWidth = 0.6;
          ctx.beginPath(); ctx.moveTo(nodes[i].x, nodes[i].y); ctx.lineTo(nodes[j].x, nodes[j].y); ctx.stroke();
        }
      }
      nodes.forEach(n => {
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.35)"; ctx.fill();
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    const onResize = () => { W = canvas.width = canvas.offsetWidth; H = canvas.height = canvas.offsetHeight; };
    window.addEventListener("resize", onResize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", onResize); };
  }, []);
  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full opacity-50" />;
}

// ─── Scroll-fade hook ─────────────────────────────────────────────────────────
function useFadeIn() {
  const ref = useRef(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVis(true); obs.disconnect(); } }, { threshold: 0.1 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return [ref, vis];
}

// ─── Feature card ─────────────────────────────────────────────────────────────
function FeatureCard({ icon, title, desc, delay = 0 }) {
  const [ref, vis] = useFadeIn();
  return (
    <div ref={ref} style={{ transitionDelay: `${delay}ms` }}
      className={`group rounded-3xl border border-white/10 bg-white/5 backdrop-blur-sm p-8 transition-all duration-700 hover:bg-white/8 hover:border-white/20 hover:scale-[1.02] cursor-default
        ${vis ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
      <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center text-2xl mb-6">
        {icon}
      </div>
      <h3 className="text-white font-bold text-xl mb-3">{title}</h3>
      <p className="text-white/50 text-sm leading-relaxed">{desc}</p>
    </div>
  );
}

// ─── How it works step ────────────────────────────────────────────────────────
function Step({ num, icon, title, desc, last }) {
  const [ref, vis] = useFadeIn();
  return (
    <div ref={ref} className={`flex gap-6 transition-all duration-700 ${vis ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-8"}`}
      style={{ transitionDelay: `${num * 100}ms` }}>
      <div className="flex flex-col items-center">
        <div className="w-11 h-11 rounded-full bg-white text-black flex items-center justify-center font-black text-sm shrink-0">
          {icon}
        </div>
        {!last && <div className="w-px flex-1 bg-white/10 mt-2 min-h-[40px]" />}
      </div>
      <div className="pb-10">
        <p className="text-white/30 text-xs font-bold tracking-widest uppercase mb-1">Step {num}</p>
        <h4 className="text-white font-bold text-lg mb-1">{title}</h4>
        <p className="text-white/50 text-sm leading-relaxed max-w-lg">{desc}</p>
      </div>
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = (id) => { document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }); setMenuOpen(false); };

  return (
    <div className="bg-background text-white min-h-screen font-sans antialiased">

      {/* ══ NAVBAR ══════════════════════════════════════════════════════════════ */}
      <header className={`fixed top-0 inset-x-0 z-50 transition-all duration-300
        ${scrolled ? "bg-black/80 backdrop-blur-xl border-b border-white/8" : "bg-transparent"}`}>
        <div className="max-w-7xl mx-auto px-5 h-16 flex items-center gap-6">
          <button onClick={() => scrollTo("hero")} className="flex items-center gap-2.5 shrink-0">
            <img src={logo} alt="SwaRojgar" className="h-8 w-auto object-contain brightness-0 invert" />
          </button>

          <nav className="hidden md:flex items-center gap-1 flex-1 justify-center">
            {[["Features","features"],["How It Works","howitworks"],["Why Us","kleros"]].map(([l, id]) => (
              <button key={id} onClick={() => scrollTo(id)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-white/50 hover:text-white hover:bg-white/8 transition-all">
                {l}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-3 ml-auto">
            <button onClick={() => navigate("/login")}
              className="hidden md:block px-4 py-2 rounded-xl text-sm font-semibold text-white/60 hover:text-white hover:bg-white/8 transition-all">
              Log In
            </button>
            <button onClick={() => navigate("/signup")}
              className="px-5 py-2.5 rounded-xl bg-white text-black text-sm font-bold hover:bg-gray-100 transition-all hover:scale-105 shadow-lg">
              Get Started →
            </button>
            <button onClick={() => setMenuOpen(m => !m)} className="md:hidden p-2">
              <div className="space-y-1.5">
                <span className={`block w-5 h-0.5 bg-white transition-transform ${menuOpen ? "rotate-45 translate-y-2" : ""}`} />
                <span className={`block w-5 h-0.5 bg-white transition-opacity ${menuOpen ? "opacity-0" : ""}`} />
                <span className={`block w-5 h-0.5 bg-white transition-transform ${menuOpen ? "-rotate-45 -translate-y-2" : ""}`} />
              </div>
            </button>
          </div>
        </div>
        {menuOpen && (
          <div className="md:hidden px-5 pb-4 space-y-1 bg-black/95 border-b border-white/8">
            {[["Features","features"],["How It Works","howitworks"],["Why Us","kleros"]].map(([l, id]) => (
              <button key={id} onClick={() => scrollTo(id)}
                className="block w-full text-left px-4 py-3 rounded-xl text-sm text-white/70 hover:bg-white/8 transition-all">{l}</button>
            ))}
            <button onClick={() => navigate("/login")} className="block w-full text-left px-4 py-3 rounded-xl text-sm text-white/70 hover:bg-white/8">Log In</button>
          </div>
        )}
      </header>

      {/* ══ HERO ════════════════════════════════════════════════════════════════ */}
      <section id="hero" className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
        <DotCanvas />
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-white/3 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-5 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/15 bg-white/5 text-white/60 text-xs font-semibold mb-8 backdrop-blur-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            Ethereum Sepolia · Kleros ERC-792/1497 · IPFS Evidence
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black leading-[1.05] tracking-tight mb-6">
            Freelance with<br />
            <span className="text-white">Confidence.</span>
            <br />
            <span className="text-white/30 text-4xl sm:text-5xl">Secured by Code.</span>
          </h1>

          <p className="text-white/50 text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            The decentralized gig platform where payments are locked in smart contracts and disputes are resolved by AI + Kleros Court — no middlemen, no trust required.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button onClick={() => navigate("/signup")}
              className="group flex items-center gap-3 px-8 py-4 rounded-2xl bg-white text-black font-bold text-base transition-all hover:bg-gray-100 hover:scale-105 shadow-2xl shadow-white/10">
              🚀 Start for Free
              <span className="transition-transform group-hover:translate-x-1">→</span>
            </button>
            <button onClick={() => navigate("/login")}
              className="flex items-center gap-3 px-8 py-4 rounded-2xl font-bold text-base border border-white/15 text-white/80 hover:bg-white/8 hover:border-white/30 transition-all hover:scale-105">
              Sign In
            </button>
          </div>

          <div className="flex items-center justify-center gap-10 mt-14 flex-wrap">
            {[["100%","On-chain escrow"],["3-Tier","Dispute resolution"],["0%","Hidden fees"]].map(([val, label]) => (
              <div key={label} className="text-center">
                <p className="text-3xl font-black text-white">{val}</p>
                <p className="text-white/35 text-xs mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-px h-10 bg-gradient-to-b from-white/30 to-transparent mx-auto" />
        </div>
      </section>

      {/* ══ FEATURES ════════════════════════════════════════════════════════════ */}
      <section id="features" className="py-28 px-5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-white/30 text-xs font-bold tracking-[0.3em] uppercase mb-3">Why SwaRojgar</p>
            <h2 className="text-4xl sm:text-5xl font-black mb-4">
              Built different.<br />
              <span className="text-white/40">Secured by math.</span>
            </h2>
            <p className="text-white/50 max-w-xl mx-auto">
              Other platforms promise fairness. We encode it into a smart contract.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FeatureCard delay={0} icon="🔒" title="Smart Escrow Protection"
              desc="Funds lock in an audited Solidity contract the moment a gig is created. Nobody — not even us — can touch them before both parties agree." />
            <FeatureCard delay={100} icon="⚖️" title="3-Tier Justice System"
              desc="Disputes escalate through AI analysis (GPT-4), then Kleros decentralized court, then a human multisig as the final fail-safe. Trustless by design." />
            <FeatureCard delay={200} icon="🌐" title="Zero Bureaucracy"
              desc="No banks. No wire transfers. Connect a wallet, get paid in SRT tokens. Instant settlement, global reach, 2% platform fee max." />
          </div>
        </div>
      </section>

      {/* ══ HOW IT WORKS ════════════════════════════════════════════════════════ */}
      <section id="howitworks" className="py-28 px-5 bg-white/[0.02]">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-white/30 text-xs font-bold tracking-[0.3em] uppercase mb-3">The Process</p>
            <h2 className="text-4xl sm:text-5xl font-black mb-4">Five steps to getting paid.</h2>
          </div>
          <Step num={1} icon="📋" title="Post the Gig"
            desc="Client describes the work, sets the SRT budget, and publishes to the marketplace." />
          <Step num={2} icon="🔒" title="Fund Escrow"
            desc="Client approves SRT transfer. Smart contract locks funds — nobody can access them until the gig resolves." />
          <Step num={3} icon="🚀" title="Freelancer Delivers"
            desc="Freelancer submits proof-of-work pinned to IPFS. Immutable, tamper-proof evidence." />
          <Step num={4} icon="✅" title="Client Approves → Funds Released"
            desc="One click. The smart contract transfers SRT to the freelancer instantly." />
          <Step num={5} icon="⚖️" title="Dispute? 3-Tier Resolution"
            desc="AI reviews → Kleros jurors vote → Human admin backstop. Funds release per the verdict." last />
        </div>
      </section>

      {/* ══ KLEROS / TRUST ══════════════════════════════════════════════════════ */}
      <section id="kleros" className="py-28 px-5">
        <div className="max-w-6xl mx-auto">
          <div className="relative rounded-3xl border border-white/10 bg-white/4 overflow-hidden p-10 sm:p-16">
            <div className="absolute top-0 right-0 w-96 h-96 bg-white/3 rounded-full blur-3xl pointer-events-none" />

            <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/8 border border-white/15 text-white/60 text-xs font-bold mb-6">
                  ⚖️ Kleros Court Integration
                </div>
                <h2 className="text-4xl font-black text-white mb-5">
                  Decentralized justice<br />on every dispute.
                </h2>
                <p className="text-white/50 mb-6 leading-relaxed">
                  When AI can't resolve a dispute, the case goes to <strong className="text-white">Kleros Court</strong> — a decentralized protocol with over 800,000 PNK staked by incentivized jurors worldwide.
                </p>
                <ul className="space-y-3 mb-8">
                  {[
                    ["🧑‍⚖️", "Real jurors selected by sortition — no room for corruption"],
                    ["🛡️",  "Schelling point game theory ensures honest verdicts"],
                    ["📄",  "Evidence stored on IPFS per ERC-1497 standard"],
                    ["⚡",  "Smart contract enforces the verdict automatically"],
                  ].map(([ic, t]) => (
                    <li key={t} className="flex items-start gap-3 text-sm text-white/50">
                      <span className="text-base shrink-0">{ic}</span>
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex flex-col gap-4">
                {[
                  { tier: "Tier 1", label: "AI Arbitrator",   icon: "🤖", desc: "GPT-4 analyzes the brief and proof. Both parties vote to accept or reject the verdict." },
                  { tier: "Tier 2", label: "Kleros Court",    icon: "⚖️", desc: "3 randomly selected jurors review IPFS evidence. Schelling point voting determines the ruling." },
                  { tier: "Tier 3", label: "Human Admin",     icon: "👤", desc: "Platform multisig as the final fail-safe. Only triggered if Kleros refuses to arbitrate." },
                ].map(({ tier, label, icon, desc }) => (
                  <div key={tier} className="flex gap-4 p-5 rounded-2xl bg-white/4 border border-white/8 hover:bg-white/6 transition-all">
                    <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center text-lg shrink-0">{icon}</div>
                    <div>
                      <p className="text-white/30 text-xs font-bold uppercase tracking-wide mb-0.5">{tier}</p>
                      <p className="text-white font-bold text-sm mb-1">{label}</p>
                      <p className="text-white/40 text-xs leading-relaxed">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ CTA BANNER ══════════════════════════════════════════════════════════ */}
      <section className="py-24 px-5">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl sm:text-5xl font-black mb-5 text-white">
            Ready to work<br />
            <span className="text-white/30">without the middlemen?</span>
          </h2>
          <p className="text-white/50 mb-8 text-lg">
            Join SwaRojgar today. Post your first gig or start applying — your wallet is your identity.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button onClick={() => navigate("/signup")}
              className="px-8 py-4 rounded-2xl bg-white text-black font-bold text-base hover:bg-gray-100 transition-all hover:scale-105 shadow-2xl shadow-white/10">
              🧑‍💼 I'm a Client →
            </button>
            <button onClick={() => navigate("/signup")}
              className="px-8 py-4 rounded-2xl border border-white/15 text-white font-bold text-base hover:bg-white/8 hover:border-white/30 transition-all hover:scale-105">
              👷 I'm a Freelancer →
            </button>
          </div>
        </div>
      </section>

      {/* ══ FOOTER ══════════════════════════════════════════════════════════════ */}
      <footer className="border-t border-white/8 py-10 px-5">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src={logo} alt="SwaRojgar" className="h-7 w-auto brightness-0 invert opacity-60" />
            <span className="text-white/30 text-sm">SwaRojgar</span>
          </div>
          <p className="text-white/20 text-xs text-center">
            Decentralized freelancing on Ethereum Sepolia · Powered by Kleros Court
          </p>
          <div className="flex items-center gap-4">
            <button onClick={() => navigate("/login")} className="text-white/30 hover:text-white text-xs transition-colors">Sign In</button>
            <button onClick={() => navigate("/signup")} className="text-white/30 hover:text-white text-xs transition-colors">Sign Up</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
