import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useGig } from './context/GigContext';
import { useTheme } from './context/ThemeContext';
import { useClerk } from '@clerk/clerk-react';
import axios from 'axios';

const API = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:5010';

export default function Navbar() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { wallet, connectWallet, logout, workspace, switchWorkspace, userRole } = useGig();
  const { dark, toggle } = useTheme();
  const { signOut } = useClerk();

  const [profileOpen, setProfileOpen] = useState(false);
  const [exploreOpen, setExploreOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [recentJobs,  setRecentJobs]  = useState([]);

  const profileRef = useRef(null);
  const exploreRef = useRef(null);

  const handleLogout = async () => {
    logout();
    await signOut();
    navigate('/login');
    setProfileOpen(false);
  };

  const isActive  = (p) => location.pathname === p;
  const shortAddr = wallet.address
    ? `${wallet.address.slice(0, 5)}…${wallet.address.slice(-4)}`
    : null;
  const isBuyer  = workspace === 'buyer';
  const isWorker = workspace === 'worker';

  useEffect(() => {
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
      if (exploreRef.current && !exploreRef.current.contains(e.target))  setExploreOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (exploreOpen && recentJobs.length === 0) {
      axios.get(`${API}/api/jobs/available`)
        .then(r => setRecentJobs((r.data || []).slice(0, 2)))
        .catch(() => {});
    }
  }, [exploreOpen]);

  const handleSearch = (e) => {
    e.preventDefault();
    navigate('/search');
  };

  // Build nav links based on workspace
  const navLinks = [
    { label: 'Browse',    path: '/home' },
    ...(isBuyer  ? [{ label: 'Dashboard', path: '/client-dashboard' }, { label: 'My Jobs', path: '/customer-jobs' }] : []),
    ...(isWorker ? [{ label: 'Dashboard', path: '/freelancer-dashboard' }, { label: 'My Gigs', path: '/freelancer-jobs' }] : []),
    { label: 'Disputes',  path: '/ResolutionCenter' },
  ];

  return (
    <header className="sticky top-3 z-50 flex justify-center px-4 animate-rise-in">
      <div className="island flex w-full max-w-[1100px] items-center justify-between gap-4
        rounded-full border border-white/[0.07] bg-white/[0.03] px-3 py-2 pl-4
        backdrop-blur-2xl backdrop-saturate-200">

        {/* ── Logo ── */}
        <div className="flex items-center gap-5 shrink-0">
          <button onClick={() => navigate('/')}
            className="flex items-center gap-2 pr-1 group">
            <div className="bg-gold grid h-7 w-7 place-items-center rounded-full text-white/90 shrink-0">
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-display text-[15px] font-semibold tracking-tight text-foreground">Swarojgar</span>
          </button>

          {/* Nav links */}
          <nav className="hidden items-center gap-0.5 md:flex">
            {navLinks.map(({ label, path }) => (
              <button key={path} onClick={() => navigate(path)}
                className={`relative rounded-full px-3 py-1.5 text-[13px] font-medium transition-all duration-200
                  ${isActive(path)
                    ? 'bg-white/[0.07] text-foreground shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]'
                    : 'text-muted-foreground hover:text-foreground hover:bg-white/[0.04]'
                  }`}>
                {label}
              </button>
            ))}

            {/* Explore mega-dropdown */}
            <div ref={exploreRef} className="relative">
              <button
                onClick={() => setExploreOpen(v => !v)}
                onMouseEnter={() => setExploreOpen(true)}
                className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-[13px] font-medium transition-all duration-200
                  ${exploreOpen ? 'bg-white/[0.07] text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-white/[0.04]'}`}>
                Explore
                <svg className={`w-3 h-3 transition-transform duration-200 ${exploreOpen ? 'rotate-180' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {exploreOpen && (
                <div onMouseLeave={() => setExploreOpen(false)}
                  className="nav-drop absolute top-[calc(100%+10px)] left-0 w-[580px] rounded-2xl
                    border border-hairline bg-surface shadow-island overflow-hidden z-50 p-5">
                  <div className="flex gap-5">
                    <div className="w-48 shrink-0 space-y-0.5">
                      {[
                        { icon: "🔍", label: "Browse Jobs",       desc: "Find gigs that match your skills",   path: "/freelancer-jobs"   },
                        { icon: "📝", label: "Post a Job",        desc: "Hire talent for your next project",  path: "/customer-jobs"     },
                        { icon: "🏠", label: "Social Feed",       desc: "Discover posts from the community", path: "/home"              },
                        { icon: "⚖️", label: "Resolution Center", desc: "Dispute resolution & arbitration",   path: "/ResolutionCenter"  },
                        { icon: "🔎", label: "Search",            desc: "Search gigs by keyword",             path: "/search"            },
                      ].map(item => (
                        <button key={item.path}
                          onClick={() => { navigate(item.path); setExploreOpen(false); }}
                          className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors group">
                          <div className="flex items-start gap-3">
                            <span className="text-base mt-0.5">{item.icon}</span>
                            <div>
                              <p className="text-[13px] font-semibold text-foreground">{item.label}</p>
                              <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">{item.desc}</p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                    <div className="w-px bg-hairline shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Latest Jobs</p>
                      {recentJobs.length === 0 ? (
                        <div className="space-y-3">
                          {[1,2].map(i => <div key={i} className="h-16 rounded-xl bg-surface-2 animate-pulse" />)}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {recentJobs.map(job => (
                            <button key={job._id}
                              onClick={() => { navigate('/freelancer-jobs'); setExploreOpen(false); }}
                              className="w-full text-left rounded-xl border border-hairline bg-surface-2/60 hover:bg-surface-2 p-3 transition-colors">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="text-[13px] font-semibold text-foreground line-clamp-1">{job.title}</p>
                                  <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{job.content}</p>
                                </div>
                                <span className="shrink-0 text-sm font-bold text-foreground">{job.srtAmount} SRT</span>
                              </div>
                            </button>
                          ))}
                          <button onClick={() => { navigate('/freelancer-jobs'); setExploreOpen(false); }}
                            className="text-[11px] text-muted-foreground hover:text-foreground transition-colors">
                            View all jobs →
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </nav>
        </div>

        {/* ── Right side ── */}
        <div className="flex items-center gap-2 shrink-0">

          {/* Workspace switcher */}
          <div className="hidden md:flex h-7 items-center gap-0.5 rounded-full bg-white/[0.04] p-0.5 border border-hairline text-[11px]">
            <button onClick={() => switchWorkspace('buyer')}
              className={`rounded-full px-2.5 py-0.5 font-semibold transition-all duration-200
                ${isBuyer ? 'bg-gold text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
              Buyer
            </button>
            <button onClick={() => switchWorkspace('worker')}
              className={`rounded-full px-2.5 py-0.5 font-semibold transition-all duration-200
                ${isWorker ? 'bg-gold text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
              Worker
            </button>
          </div>

          {/* Theme toggle */}
          <button onClick={toggle}
            className="grid h-8 w-8 place-items-center rounded-full bg-white/[0.04] border border-hairline
              text-muted-foreground hover:text-foreground hover:bg-white/[0.08] transition-all duration-200 text-sm">
            {dark ? '☀️' : '🌙'}
          </button>

          {/* Wallet */}
          {!wallet.connected ? (
            <button onClick={connectWallet} disabled={wallet.connecting}
              className="bg-gold inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[12px] font-semibold
                text-white shadow-glow transition-all hover:opacity-90 disabled:opacity-50">
              {wallet.connecting
                ? <><span className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" />Connecting…</>
                : '🔗 Connect'}
            </button>
          ) : (
            <div className="flex items-center gap-1.5 rounded-full bg-white/[0.04] border border-hairline px-2.5 py-1">
              <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse-dot" />
              <span className="font-mono-tab text-[11px] text-muted-foreground">{shortAddr}</span>
              {wallet.chainId !== 11155111 && (
                <span className="px-1.5 py-0.5 rounded-full bg-warning/20 text-warning text-[10px] font-semibold">
                  Wrong Net
                </span>
              )}
            </div>
          )}

          {/* Profile menu */}
          <div ref={profileRef} className="relative">
            <button onClick={() => setProfileOpen(v => !v)}
              className="bg-gold grid h-8 w-8 place-items-center rounded-full text-xs font-bold text-white
                transition-transform duration-200 hover:scale-105 ring-2 ring-primary/20">
              {userRole === 'client' ? 'C' : userRole === 'freelancer' ? 'F' : '?'}
            </button>

            {profileOpen && (
              <div className="nav-drop absolute right-0 top-[calc(100%+10px)] w-52 rounded-2xl
                border border-hairline bg-surface shadow-island overflow-hidden z-50">
                <div className="px-4 py-3 border-b border-hairline">
                  <p className="text-xs font-bold text-foreground capitalize">{userRole || 'User'}</p>
                  <p className="text-[11px] text-muted-foreground truncate mt-0.5 font-mono-tab">
                    {wallet.address ? shortAddr : 'Wallet not connected'}
                  </p>
                </div>
                {userRole === 'client' && <>
                  <DropItem onClick={() => { navigate('/client-dashboard'); setProfileOpen(false); }}>🏠 Dashboard</DropItem>
                  <DropItem onClick={() => { navigate('/clientprofile'); setProfileOpen(false); }}>👤 Profile</DropItem>
                  <DropItem onClick={() => { navigate('/customer-jobs'); setProfileOpen(false); }}>💼 My Jobs</DropItem>
                </>}
                {userRole === 'freelancer' && <>
                  <DropItem onClick={() => { navigate('/freelancer-dashboard'); setProfileOpen(false); }}>🏠 Dashboard</DropItem>
                  <DropItem onClick={() => { navigate('/profile'); setProfileOpen(false); }}>👤 Profile</DropItem>
                  <DropItem onClick={() => { navigate('/freelancer-jobs'); setProfileOpen(false); }}>💼 My Gigs</DropItem>
                </>}
                <DropItem onClick={() => { navigate('/ResolutionCenter'); setProfileOpen(false); }}>⚖️ Disputes</DropItem>
                <div className="h-px bg-hairline mx-3 my-1" />
                <DropItem danger onClick={handleLogout}>🚪 Log Out</DropItem>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

function DropItem({ children, onClick, danger }) {
  return (
    <button onClick={onClick}
      className={`w-full text-left px-4 py-2.5 text-[13px] transition-colors
        ${danger
          ? 'text-destructive hover:bg-destructive/10'
          : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'}`}>
      {children}
    </button>
  );
}
