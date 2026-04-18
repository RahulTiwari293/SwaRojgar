import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { IoSearch } from 'react-icons/io5';
import logo from './assets/logo.png';
import { useGig } from './context/GigContext';
import { useTheme } from './context/ThemeContext';
import axios from 'axios';

const API = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5010';

function Navbar() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { wallet, connectWallet, logout, workspace, switchWorkspace, userRole } = useGig();
  const { dark, toggle } = useTheme();

  const [profileOpen,  setProfileOpen]  = useState(false);
  const [exploreOpen,  setExploreOpen]  = useState(false);
  const [searchQuery,  setSearchQuery]  = useState('');
  const [recentJobs,   setRecentJobs]   = useState([]);

  const profileRef = useRef(null);
  const exploreRef = useRef(null);

  const isActive  = (p) => location.pathname === p;
  const shortAddr = wallet.address
    ? `${wallet.address.slice(0, 5)}...${wallet.address.slice(-4)}`
    : null;
  const isBuyer  = workspace === 'buyer';
  const isWorker = workspace === 'worker';

  // Close menus on outside click
  useEffect(() => {
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
      if (exploreRef.current && !exploreRef.current.contains(e.target))  setExploreOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Fetch recent jobs when explore opens
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

  return (
    <>
      <style>{`
        .nav-fade-in {
          animation: navFadeIn 0.18s cubic-bezier(0.16,1,0.3,1) both;
        }
        @keyframes navFadeIn {
          from { opacity: 0; transform: translateY(-6px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .nav-link-active::after {
          content: '';
          position: absolute;
          bottom: -2px; left: 0; right: 0;
          height: 2px;
          background: currentColor;
          border-radius: 2px;
        }
      `}</style>

      <nav className="sticky top-0 z-50 w-full
        bg-white/90 dark:bg-[#0a0a0a]/95
        border-b border-gray-200 dark:border-white/8
        backdrop-blur-xl transition-colors duration-300">

        <div className="max-w-screen-xl mx-auto px-5 h-16 flex items-center gap-3">

          {/* ── Logo ─────────────────────────────────────────────────── */}
          <button onClick={() => navigate('/')} className="shrink-0 mr-2">
            <img src={logo} alt="SwaRojgar" className="h-8 w-auto object-contain" />
          </button>

          {/* ── Nav links ─────────────────────────────────────────────── */}
          <div className="hidden md:flex items-center gap-1">
            <NavLink active={isActive('/home')} onClick={() => navigate('/home')}>Browse</NavLink>

            {isBuyer && (
              <>
                <NavLink active={isActive('/client-dashboard')} onClick={() => navigate('/client-dashboard')}>Dashboard</NavLink>
                <NavLink active={isActive('/customer-jobs')}    onClick={() => navigate('/customer-jobs')}>My Jobs</NavLink>
              </>
            )}
            {isWorker && (
              <>
                <NavLink active={isActive('/freelancer-dashboard')} onClick={() => navigate('/freelancer-dashboard')}>Dashboard</NavLink>
                <NavLink active={isActive('/freelancer-jobs')}      onClick={() => navigate('/freelancer-jobs')}>My Gigs</NavLink>
              </>
            )}

            <NavLink active={isActive('/ResolutionCenter')} onClick={() => navigate('/ResolutionCenter')}>Disputes</NavLink>

            {/* Explore mega-dropdown */}
            <div ref={exploreRef} className="relative">
              <button
                onClick={() => setExploreOpen(v => !v)}
                onMouseEnter={() => setExploreOpen(true)}
                className={`relative flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150
                  ${exploreOpen
                    ? 'text-gray-900 dark:text-white'
                    : 'text-gray-500 dark:text-white/50 hover:text-gray-900 dark:hover:text-white'}`}
              >
                Explore
                <svg className={`w-3.5 h-3.5 transition-transform duration-200 ${exploreOpen ? 'rotate-180' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {exploreOpen && (
                <div
                  onMouseLeave={() => setExploreOpen(false)}
                  className="nav-fade-in absolute top-[calc(100%+8px)] left-0 w-[640px] rounded-2xl
                    bg-white dark:bg-gray-950
                    border border-gray-100 dark:border-white/10
                    shadow-2xl shadow-gray-200/60 dark:shadow-black/60
                    overflow-hidden z-50 p-5"
                >
                  <div className="flex gap-6">
                    {/* Left: categories */}
                    <div className="w-52 shrink-0 space-y-1">
                      {[
                        { icon: "🔍", label: "Browse Jobs",       desc: "Find gigs that match your skills",    path: "/freelancer-jobs" },
                        { icon: "📝", label: "Post a Job",        desc: "Hire talent for your next project",   path: "/customer-jobs"   },
                        { icon: "🏠", label: "Social Feed",       desc: "Discover posts from the community",  path: "/home"            },
                        { icon: "⚖️", label: "Resolution Center", desc: "Dispute resolution & arbitration",    path: "/ResolutionCenter"},
                        { icon: "🔎", label: "Search",            desc: "Search jobs by keyword or category", path: "/search"          },
                      ].map(item => (
                        <button
                          key={item.path}
                          onClick={() => { navigate(item.path); setExploreOpen(false); }}
                          className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-white/6 transition-colors group"
                        >
                          <div className="flex items-start gap-3">
                            <span className="text-lg mt-0.5">{item.icon}</span>
                            <div>
                              <p className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-black dark:group-hover:text-white">{item.label}</p>
                              <p className="text-xs text-gray-400 dark:text-white/35 leading-snug mt-0.5">{item.desc}</p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>

                    {/* Divider */}
                    <div className="w-px bg-gray-100 dark:bg-white/8 shrink-0" />

                    {/* Right: featured jobs */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-400 dark:text-white/30 uppercase tracking-wider mb-3">
                        Latest Jobs
                      </p>
                      {recentJobs.length === 0 ? (
                        <div className="space-y-3">
                          {[1, 2].map(i => (
                            <div key={i} className="h-20 rounded-xl bg-gray-100 dark:bg-white/5 animate-pulse" />
                          ))}
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {recentJobs.map(job => (
                            <button
                              key={job._id}
                              onClick={() => { navigate('/freelancer-jobs'); setExploreOpen(false); }}
                              className="w-full text-left rounded-xl border border-gray-100 dark:border-white/8 bg-gray-50 dark:bg-white/4 hover:bg-gray-100 dark:hover:bg-white/8 p-3 transition-colors group"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-1 group-hover:text-black dark:group-hover:text-white">{job.title}</p>
                                  <p className="text-xs text-gray-400 dark:text-white/35 line-clamp-1 mt-0.5">{job.content}</p>
                                </div>
                                <span className="shrink-0 text-sm font-black text-gray-900 dark:text-white">{job.srtAmount} SRT</span>
                              </div>
                            </button>
                          ))}
                          <button
                            onClick={() => { navigate('/freelancer-jobs'); setExploreOpen(false); }}
                            className="text-xs text-gray-400 dark:text-white/30 hover:text-gray-700 dark:hover:text-white transition-colors"
                          >
                            View all jobs →
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Center: Search ────────────────────────────────────────── */}
          <form onSubmit={handleSearch}
            className="hidden lg:flex items-center gap-2 mx-auto max-w-xs flex-1
              bg-gray-100 dark:bg-white/5
              border border-gray-200 dark:border-white/10
              rounded-full px-4 py-2 transition-all hover:border-gray-300 dark:hover:border-white/20">
            <IoSearch className="text-gray-400 dark:text-white/30 text-sm shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onFocus={() => navigate('/search')}
              placeholder="Search gigs..."
              className="bg-transparent text-sm text-gray-600 dark:text-white/60 placeholder-gray-400 dark:placeholder-white/30 outline-none w-full"
            />
          </form>

          {/* ── Right side ───────────────────────────────────────────── */}
          <div className="flex items-center gap-2 ml-auto shrink-0">

            {/* Workspace switcher — compact pill */}
            <div className="hidden md:flex items-center bg-gray-100 dark:bg-white/6 border border-gray-200 dark:border-white/10 rounded-full p-0.5 shrink-0">
              <WsBtn active={isBuyer}  onClick={() => switchWorkspace('buyer')}>🧑‍💼 Buyer</WsBtn>
              <WsBtn active={isWorker} onClick={() => switchWorkspace('worker')}>👷 Worker</WsBtn>
            </div>

            {/* Dark/Light toggle */}
            <button
              onClick={toggle}
              className="w-9 h-9 rounded-full flex items-center justify-center
                bg-gray-100 dark:bg-white/8 border border-gray-200 dark:border-white/10
                text-gray-500 dark:text-white/60 hover:bg-gray-200 dark:hover:bg-white/15
                transition-all text-base"
            >
              {dark ? '☀️' : '🌙'}
            </button>

            {/* Wallet / Connect */}
            {!wallet.connected ? (
              <button
                onClick={connectWallet}
                disabled={wallet.connecting}
                className="flex items-center gap-2 px-4 py-2 rounded-full
                  bg-black dark:bg-white text-white dark:text-black
                  hover:bg-gray-800 dark:hover:bg-gray-100
                  text-xs font-semibold transition-all shadow-sm disabled:opacity-50"
              >
                {wallet.connecting
                  ? <><span className="w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" />Connecting...</>
                  : '🔗 Connect Wallet'
                }
              </button>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full
                bg-gray-100 dark:bg-white/6 border border-gray-200 dark:border-white/10">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-gray-600 dark:text-white/70 text-xs font-mono">{shortAddr}</span>
                {wallet.chainId !== 11155111 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-300 text-[10px] font-semibold">
                    Wrong Net
                  </span>
                )}
              </div>
            )}

            {/* Profile menu */}
            <div ref={profileRef} className="relative">
              <button
                onClick={() => setProfileOpen(v => !v)}
                className="w-9 h-9 rounded-full
                  bg-gray-900 dark:bg-white/10 border-2 border-gray-200 dark:border-white/20
                  flex items-center justify-center text-sm font-bold text-white
                  hover:border-gray-400 dark:hover:border-white/40 transition-all"
              >
                {userRole === 'client' ? '🧑‍💼' : userRole === 'freelancer' ? '👷' : '?'}
              </button>

              {profileOpen && (
                <div className="nav-fade-in absolute right-0 top-12 w-52 rounded-2xl
                  bg-white dark:bg-gray-900 border border-gray-100 dark:border-white/10
                  shadow-xl dark:shadow-2xl overflow-hidden z-50">

                  <div className="px-4 py-3 border-b border-gray-100 dark:border-white/8">
                    <p className="text-xs font-bold text-gray-900 dark:text-white capitalize">{userRole || 'User'}</p>
                    <p className="text-xs text-gray-400 dark:text-white/30 truncate mt-0.5">
                      {wallet.address ? shortAddr : 'Wallet not connected'}
                    </p>
                  </div>

                  {userRole === 'client' && (
                    <>
                      <DropItem onClick={() => { navigate('/client-dashboard'); setProfileOpen(false); }}>🏠 Dashboard</DropItem>
                      <DropItem onClick={() => { navigate('/clientprofile'); setProfileOpen(false); }}>👤 Profile</DropItem>
                      <DropItem onClick={() => { navigate('/customer-jobs'); setProfileOpen(false); }}>💼 My Jobs</DropItem>
                    </>
                  )}
                  {userRole === 'freelancer' && (
                    <>
                      <DropItem onClick={() => { navigate('/freelancer-dashboard'); setProfileOpen(false); }}>🏠 Dashboard</DropItem>
                      <DropItem onClick={() => { navigate('/profile'); setProfileOpen(false); }}>👤 Profile</DropItem>
                      <DropItem onClick={() => { navigate('/freelancer-jobs'); setProfileOpen(false); }}>💼 My Gigs</DropItem>
                    </>
                  )}
                  <DropItem onClick={() => { navigate('/ResolutionCenter'); setProfileOpen(false); }}>⚖️ Disputes</DropItem>
                  <div className="h-px bg-gray-100 dark:bg-white/8 mx-3 my-1" />
                  <DropItem danger onClick={() => { logout(); navigate('/login'); setProfileOpen(false); }}>
                    🚪 Log Out
                  </DropItem>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}

/* ─── Sub-components ────────────────────────────────────────────────────────── */

function WsBtn({ active, onClick, children }) {
  return (
    <button onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200
        ${active
          ? 'bg-black dark:bg-white text-white dark:text-black shadow-sm'
          : 'text-gray-400 dark:text-white/40 hover:text-gray-700 dark:hover:text-white/70'
        }`}>
      {children}
    </button>
  );
}

function NavLink({ children, onClick, active }) {
  return (
    <button
      onClick={onClick}
      className={`relative px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150
        ${active
          ? 'text-gray-900 dark:text-white bg-gray-100 dark:bg-white/10 nav-link-active'
          : 'text-gray-500 dark:text-white/50 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/6'
        }`}
    >
      {children}
    </button>
  );
}

function DropItem({ children, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-2.5 text-sm transition-colors
        ${danger
          ? 'text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
          : 'text-gray-700 dark:text-white/70 hover:bg-gray-50 dark:hover:bg-white/8 hover:text-gray-900 dark:hover:text-white'
        }`}
    >
      {children}
    </button>
  );
}

export default Navbar;
