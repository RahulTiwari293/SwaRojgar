/**
 * navbar.jsx — SwaRojgar Professional Navbar
 *
 * Features:
 *  - Buyer ↔ Worker workspace switcher (persists via GigContext)
 *  - Wallet Connect button that doesn't break on page refresh
 *    (auto-reconnects via GigContext useEffect)
 *  - Role-based navigation links
 *  - Law-Tech dark aesthetic with glassmorphism
 */

import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { IoSearch, IoChevronDown } from 'react-icons/io5';
import logo from './assets/logo.png';
import { useGig } from './context/GigContext';
import ExploreDropdown from './navbarComponents/ExploreDropdown';
import OrdersDropdown from './navbarComponents/OrderDropdown';

function Navbar() {
    const navigate  = useNavigate();
    const location  = useLocation();
    const {
        wallet,
        connectWallet,
        logout,
        workspace,
        switchWorkspace,
        userRole
    } = useGig();

    const [dropdownOpen, setDropdownOpen]           = useState(false);
    const [ordersDropdownOpen, setOrdersDropdownOpen] = useState(false);
    const [profileMenuOpen, setProfileMenuOpen]     = useState(false);
    const profileRef = useRef(null);

    const isActive = (path) => location.pathname === path;

    // Close profile menu on outside click
    useEffect(() => {
        const handler = (e) => {
            if (profileRef.current && !profileRef.current.contains(e.target)) {
                setProfileMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Shortened address for display
    const shortAddr = wallet.address
        ? `${wallet.address.slice(0, 5)}...${wallet.address.slice(-4)}`
        : null;

    const isBuyer  = workspace === 'buyer';
    const isWorker = workspace === 'worker';

    return (
        <nav
            className="sticky top-0 z-50 w-full border-b border-white/8 backdrop-blur-xl"
            style={{ background: 'rgba(7, 7, 17, 0.85)' }}
        >
            <div className="max-w-screen-xl mx-auto px-4 h-16 flex items-center gap-4">

                {/* ── Logo ─────────────────────────────────────────────── */}
                <button
                    onClick={() => navigate('/')}
                    className="flex items-center gap-2 shrink-0"
                    aria-label="Home"
                >
                    <img src={logo} alt="SwaRojgar" className="h-8 w-auto object-contain" />
                </button>

                {/* ── Workspace Switcher ────────────────────────────────── */}
                <div className="flex items-center bg-white/6 border border-white/10 rounded-full p-1 shrink-0">
                    <button
                        onClick={() => switchWorkspace('buyer')}
                        className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
                            isBuyer
                                ? 'bg-violet-600 text-white shadow-sm shadow-violet-500/30'
                                : 'text-white/40 hover:text-white/70'
                        }`}
                    >
                        🧑‍💼 Buyer
                    </button>
                    <button
                        onClick={() => switchWorkspace('worker')}
                        className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
                            isWorker
                                ? 'bg-cyan-600 text-white shadow-sm shadow-cyan-500/30'
                                : 'text-white/40 hover:text-white/70'
                        }`}
                    >
                        👷 Worker
                    </button>
                </div>

                {/* ── Search ───────────────────────────────────────────── */}
                <div className="flex-1 max-w-xs">
                    <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-2">
                        <IoSearch className="text-white/30 text-sm shrink-0" />
                        <input
                            type="text"
                            placeholder="Search gigs..."
                            onFocus={() => navigate('/search')}
                            readOnly
                            className="bg-transparent text-sm text-white/60 placeholder-white/30 outline-none cursor-pointer w-full"
                        />
                    </div>
                </div>

                {/* ── Nav Links ──────────────────────────────────────────── */}
                <div className="hidden md:flex items-center gap-1 flex-1 justify-center">

                    {/* Browse Jobs — always visible */}
                    <NavLink active={isActive('/home')} onClick={() => navigate('/home')}>
                        Browse
                    </NavLink>

                    {/* Buyer-mode links */}
                    {isBuyer && (
                        <>
                            <NavLink active={isActive('/customer-jobs')} onClick={() => navigate('/customer-jobs')}>
                                💼 My Jobs
                            </NavLink>
                            <NavLink active={isActive('/custescrow')} onClick={() => navigate('/custescrow')}>
                                🔒 Escrow
                            </NavLink>
                        </>
                    )}

                    {/* Worker-mode links */}
                    {isWorker && (
                        <>
                            <NavLink active={isActive('/freelancer-jobs')} onClick={() => navigate('/freelancer-jobs')}>
                                💼 My Jobs
                            </NavLink>
                            <NavLink active={isActive('/work-submission')} onClick={() => navigate('/work-submission')}>
                                📤 Submit Work
                            </NavLink>
                        </>
                    )}

                    {/* Resolution Centre — always visible after login */}
                    <NavLink active={isActive('/ResolutionCenter')} onClick={() => navigate('/ResolutionCenter')}>
                        ⚖️ Disputes
                    </NavLink>

                    <ExploreDropdown dropdownOpen={dropdownOpen} setDropdownOpen={setDropdownOpen} />
                    <OrdersDropdown ordersDropdownOpen={ordersDropdownOpen} setOrdersDropdownOpen={setOrdersDropdownOpen} />
                </div>

                {/* ── Wallet Connect ─────────────────────────────────────── */}
                <div className="flex items-center gap-3 ml-auto shrink-0">
                    {!wallet.connected ? (
                        <button
                            onClick={connectWallet}
                            disabled={wallet.connecting}
                            className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white text-xs font-semibold transition-all duration-200 shadow-lg shadow-violet-500/20 disabled:opacity-60"
                        >
                            {wallet.connecting ? (
                                <>
                                    <span className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                                    Connecting...
                                </>
                            ) : (
                                <>🔗 Connect Wallet</>
                            )}
                        </button>
                    ) : (
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/6 border border-white/10">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="text-white/70 text-xs font-mono">{shortAddr}</span>
                            {wallet.chainId !== 11155111 && (
                                <span className="px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-semibold">
                                    Wrong Network
                                </span>
                            )}
                        </div>
                    )}

                    {/* ── Profile Menu ───────────────────────────────────── */}
                    <div ref={profileRef} className="relative">
                        <button
                            onClick={() => setProfileMenuOpen(v => !v)}
                            className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-600/60 to-cyan-600/60 border border-white/20 flex items-center justify-center text-sm font-bold text-white hover:border-white/40 transition-all"
                        >
                            {userRole === 'client' ? '🧑‍💼' : userRole === 'freelancer' ? '👷' : '?'}
                        </button>

                        {profileMenuOpen && (
                            <div className="absolute right-0 top-12 w-48 rounded-2xl bg-slate-900/95 border border-white/10 backdrop-blur-xl shadow-2xl overflow-hidden z-50">
                                {userRole === 'client' && (
                                    <MenuItem onClick={() => { navigate('/clientprofile'); setProfileMenuOpen(false); }}>
                                        👤 Client Profile
                                    </MenuItem>
                                )}
                                {userRole === 'freelancer' && (
                                    <MenuItem onClick={() => { navigate('/profile'); setProfileMenuOpen(false); }}>
                                        👤 My Profile
                                    </MenuItem>
                                )}
                                <MenuItem onClick={() => { navigate('/ResolutionCenter'); setProfileMenuOpen(false); }}>
                                    ⚖️ Resolution Center
                                </MenuItem>
                                <div className="h-px bg-white/8 mx-3 my-1" />
                                <MenuItem
                                    onClick={() => { logout(); navigate('/login'); setProfileMenuOpen(false); }}
                                    danger
                                >
                                    🚪 Log Out
                                </MenuItem>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function NavLink({ children, onClick, active }) {
    return (
        <button
            onClick={onClick}
            className={`px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150 ${
                active
                    ? 'bg-white/10 text-white'
                    : 'text-white/50 hover:text-white hover:bg-white/6'
            }`}
        >
            {children}
        </button>
    );
}

function MenuItem({ children, onClick, danger }) {
    return (
        <button
            onClick={onClick}
            className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                danger
                    ? 'text-red-400 hover:bg-red-900/20'
                    : 'text-white/70 hover:bg-white/8 hover:text-white'
            }`}
        >
            {children}
        </button>
    );
}

export default Navbar;
