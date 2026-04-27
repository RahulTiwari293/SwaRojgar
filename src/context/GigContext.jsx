/**
 * GigContext.jsx — Global State Machine for SwaRojgar
 *
 * Provides:
 *  - Wallet state (address, signer) — persists via localStorage on refresh
 *  - User role (client / freelancer) — persists via localStorage
 *  - Active gig state (fetched from contract + synced from backend)
 *  - Transaction helpers with built-in toast feedback
 *  - Workspace switcher (Buyer ↔ Worker mode)
 *
 * Usage:
 *   wrap <App /> with <GigProvider>
 *   then: const { wallet, connectWallet, activeGig, loadGig, toast } = useGig();
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { ethers } from "ethers";
import { ESCROW_ABI, TOKEN_ABI, CONTRACT_ADDRESSES, GigStatus } from "../blockchain/klerosAbi";

const GigContext = createContext(null);

// ─── Toast Queue ──────────────────────────────────────────────────────────────
let _toastQueue = [];
let _setToastsExternal = null;

export function pushToast(message, type = "info", duration = 4000) {
    const id = Date.now() + Math.random();
    const toast = { id, message, type, duration };
    _toastQueue = [..._toastQueue, toast];
    if (_setToastsExternal) _setToastsExternal([..._toastQueue]);
    setTimeout(() => {
        _toastQueue = _toastQueue.filter(t => t.id !== id);
        if (_setToastsExternal) _setToastsExternal([..._toastQueue]);
    }, duration + 300);
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export function GigProvider({ children }) {
    // ── Wallet State ──────────────────────────────────────────────────────────
    const [wallet, setWallet] = useState({
        address: null,
        signer: null,
        provider: null,
        chainId: null,
        connected: false,
        connecting: false
    });

    // ── User State ────────────────────────────────────────────────────────────
    const [userRole, setUserRole] = useState(
        () => localStorage.getItem("userType") || null  // 'client' | 'freelancer'
    );
    const [userId, setUserId] = useState(
        () => localStorage.getItem("userId") || null
    );

    // ── Workspace Mode (Buyer ↔ Worker) ──────────────────────────────────────
    const [workspace, setWorkspace] = useState(
        () => localStorage.getItem("workspace") || "buyer" // 'buyer' | 'worker'
    );

    // ── Gig State ─────────────────────────────────────────────────────────────
    const [activeGig, setActiveGig] = useState(null);
    const [gigLoading, setGigLoading] = useState(false);

    // ── Toast State ───────────────────────────────────────────────────────────
    const [toasts, setToasts] = useState([]);
    _setToastsExternal = setToasts;

    // ── Contracts ─────────────────────────────────────────────────────────────
    const escrowRef = useRef(null);
    const tokenRef  = useRef(null);

    // ─── Initialize contracts when signer is available ────────────────────────
    useEffect(() => {
        if (wallet.signer) {
            escrowRef.current = new ethers.Contract(
                CONTRACT_ADDRESSES.escrow,
                ESCROW_ABI,
                wallet.signer
            );
            tokenRef.current = new ethers.Contract(
                CONTRACT_ADDRESSES.token,
                TOKEN_ABI,
                wallet.signer
            );
        }
    }, [wallet.signer]);

    // ─── Auto-reconnect wallet on page refresh ────────────────────────────────
    useEffect(() => {
        const reconnect = async () => {
            if (!window.ethereum) return;
            try {
                const accounts = await window.ethereum.request({ method: "eth_accounts" });
                if (accounts.length > 0) {
                    await _buildWalletState();
                }
            } catch (e) {
                console.warn("Auto-reconnect failed:", e.message);
            }
        };
        reconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ─── Listen for MetaMask account / chain changes ──────────────────────────
    useEffect(() => {
        if (!window.ethereum) return;

        const handleAccountsChanged = (accounts) => {
            if (accounts.length === 0) {
                disconnectWallet();
                pushToast("Wallet disconnected", "warning");
            } else {
                _buildWalletState();
                pushToast(`Switched to ${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}`, "info");
            }
        };

        const handleChainChanged = () => {
            pushToast("Network changed — reconnecting...", "info");
            _buildWalletState();
        };

        window.ethereum.on("accountsChanged", handleAccountsChanged);
        window.ethereum.on("chainChanged", handleChainChanged);
        return () => {
            window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
            window.ethereum.removeListener("chainChanged", handleChainChanged);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ─── Build wallet state from existing MetaMask connection ─────────────────
    async function _buildWalletState() {
        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer   = await provider.getSigner();
            const address  = await signer.getAddress();
            const network  = await provider.getNetwork();

            setWallet({
                address,
                signer,
                provider,
                chainId: Number(network.chainId),
                connected: true,
                connecting: false
            });

            // Warn if not on Sepolia (chainId 11155111)
            if (Number(network.chainId) !== 11155111) {
                pushToast("⚠️ Please switch to Ethereum Sepolia Testnet", "warning", 6000);
            }

            // Persist wallet address to MongoDB so it's linked to the user account
            const uid = localStorage.getItem("userId");
            const tok = localStorage.getItem("token");
            if (uid && tok) {
                fetch(`${import.meta.env.VITE_BACKEND_URL ?? "http://localhost:5010"}/api/users/${uid}/wallet`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json", Authorization: `Bearer ${tok}` },
                    body: JSON.stringify({ walletAddress: address })
                }).then(r => {
                    if (r.status === 404) {
                        // Stale session — clear and redirect to login
                        localStorage.removeItem("userId");
                        localStorage.removeItem("token");
                        localStorage.removeItem("userType");
                        window.location.href = "/login";
                    }
                }).catch(() => {}); // non-fatal
            }
        } catch (e) {
            console.error("Wallet state build failed:", e.message);
        }
    }

    // ─── Connect wallet ───────────────────────────────────────────────────────
    const connectWallet = useCallback(async () => {
        if (!window.ethereum) {
            pushToast("MetaMask is not installed. Please install it first.", "error", 6000);
            return;
        }
        setWallet(w => ({ ...w, connecting: true }));
        try {
            await window.ethereum.request({ method: "eth_requestAccounts" });
            await _buildWalletState();
            pushToast("✅ Wallet connected!", "success");
        } catch (e) {
            setWallet(w => ({ ...w, connecting: false }));
            pushToast(`Connection failed: ${e.message}`, "error");
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ─── Disconnect wallet ────────────────────────────────────────────────────
    const disconnectWallet = useCallback(() => {
        setWallet({ address: null, signer: null, provider: null, chainId: null, connected: false, connecting: false });
        escrowRef.current = null;
        tokenRef.current  = null;
    }, []);

    // ─── Switch workspace mode ────────────────────────────────────────────────
    const switchWorkspace = useCallback((mode) => {
        const next = mode || (workspace === "buyer" ? "worker" : "buyer");
        setWorkspace(next);
        localStorage.setItem("workspace", next);
        pushToast(`Switched to ${next === "buyer" ? "🧑‍💼 Buyer" : "👷 Worker"} mode`, "info");
    }, [workspace]);

    // ─── Load and parse a gig from the contract ───────────────────────────────
    const loadGig = useCallback(async (gigId) => {
        if (!escrowRef.current) {
            pushToast("Connect your wallet first", "warning");
            return;
        }
        setGigLoading(true);
        try {
            const raw = await escrowRef.current.getGig(gigId);
            const statusKey = Number(raw.status);

            const gig = {
                gigId:              raw.gigId,
                gigNumber:          Number(raw.gigNumber),
                client:             raw.client,
                freelancer:         raw.freelancer,
                amount:             ethers.formatEther(raw.amount),
                status:             GigStatus[statusKey],
                statusIndex:        statusKey,
                createdAt:          Number(raw.createdAt),
                deadline:           Number(raw.deadline),
                proofIpfsHash:      raw.proofIpfsHash,
                metaEvidenceUri:    raw.metaEvidenceUri,
                aiProposalUri:      raw.aiProposalUri,
                clientAcceptsAI:    raw.clientAcceptsAI,
                freelancerAcceptsAI:raw.freelancerAcceptsAI,
                metaEvidenceID:     Number(raw.metaEvidenceID),
                klerosDisputeId:    Number(raw.klerosDisputeId),
                hasKlerosDispute:   raw.hasKlerosDispute,
                klerosRuling:       Number(raw.klerosRuling),
                // Derived
                isClient:     raw.client?.toLowerCase()     === wallet.address?.toLowerCase(),
                isFreelancer: raw.freelancer?.toLowerCase() === wallet.address?.toLowerCase(),
                isParty:      raw.client?.toLowerCase()     === wallet.address?.toLowerCase() ||
                              raw.freelancer?.toLowerCase() === wallet.address?.toLowerCase(),
            };
            setActiveGig(gig);
            return gig;
        } catch (e) {
            pushToast(`Failed to load gig: ${e.reason || e.message}`, "error");
            return null;
        } finally {
            setGigLoading(false);
        }
    }, [wallet.address]);

    // ─── Generic transaction runner with toast feedback ───────────────────────
    // Usage: await runTx(() => escrow.raiseDisputeAI(gigId), "Raising dispute...")
    const runTx = useCallback(async (txFn, pendingMsg = "Confirming transaction...") => {
        if (!wallet.signer) {
            pushToast("Connect your wallet first", "warning");
            return null;
        }
        const loadingId = pushToast(`⏳ ${pendingMsg}`, "loading", 60000);
        try {
            const tx      = await txFn();
            pushToast("⏳ Waiting for block confirmation...", "loading", 15000);
            const receipt = await tx.wait();
            // Remove loading toast and show success
            _toastQueue = _toastQueue.filter(t => t.id !== loadingId);
            pushToast(`✅ Transaction confirmed!`, "success");
            return receipt;
        } catch (e) {
            _toastQueue = _toastQueue.filter(t => t.id !== loadingId);
            const msg = e.reason || e.shortMessage || e.message || "Transaction failed";
            pushToast(`❌ ${msg}`, "error", 6000);
            return null;
        }
    }, [wallet.signer]);

    // ─── Login / Logout helpers for navbar ───────────────────────────────────
    const login = useCallback((uid, role, token) => {
        setUserId(uid);
        setUserRole(role);
        localStorage.setItem("userId", uid);
        localStorage.setItem("userType", role);
        if (token) localStorage.setItem("token", token);
        // Default workspace based on role
        const ws = role === "client" ? "buyer" : "worker";
        setWorkspace(ws);
        localStorage.setItem("workspace", ws);
    }, []);

    const logout = useCallback(() => {
        setUserId(null);
        setUserRole(null);
        localStorage.removeItem("userId");
        localStorage.removeItem("userType");
        localStorage.removeItem("workspace");
        disconnectWallet();
        pushToast("Logged out successfully", "info");
    }, [disconnectWallet]);

    const value = {
        // Wallet
        wallet,
        connectWallet,
        disconnectWallet,
        // User
        userRole,
        userId,
        login,
        logout,
        // Workspace
        workspace,
        switchWorkspace,
        // Gig
        activeGig,
        gigLoading,
        loadGig,
        setActiveGig,
        // Contracts (refs — call .current inside event handlers)
        escrow: escrowRef,
        token: tokenRef,
        // Transaction helper
        runTx,
        // Toasts
        toasts,
        pushToast,
    };

    return <GigContext.Provider value={value}>{children}</GigContext.Provider>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useGig() {
    const ctx = useContext(GigContext);
    if (!ctx) throw new Error("useGig must be used inside <GigProvider>");
    return ctx;
}

export default GigContext;
