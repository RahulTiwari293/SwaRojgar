import React, { useEffect, useState } from "react";
import "./index.css";
import Login from "./Login";
import SignUp from "./SignUp";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import LandingPage from "./LandingPage.jsx";
import Home from "./Home.jsx";
import ResolutionCenter from "./ResolutionCenter.jsx";
import Profile from "./freelancerProfile.jsx";
import ClientProfile from "./clientProfile.jsx";
import ClientDashboard from "./clientDashboard.jsx";
import FreelancerDashboard from "./FreelancerDashboard.jsx";
import SearchPage from "./Search.jsx";
import WorkSubmission from "./pages/WorkSubmission.jsx";
import CustomerJobs from "./pages/CustomerJobs.jsx";
import FreelancerJobs from "./pages/FreelancerJobs.jsx";
import AuthCallback from "./pages/AuthCallback.jsx";
import Onboarding from "./pages/Onboarding.jsx";

// ─── Route guard — requires both Clerk session AND our JWT ───────────────────
function PrivateRoute({ children }) {
  const { isSignedIn, isLoaded } = useAuth();
  const token = localStorage.getItem("token");

  // Wait for Clerk to initialise before making redirect decisions
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Not signed in via Clerk → login
  if (!isSignedIn) return <Navigate to="/login" replace />;

  // Clerk session exists but our JWT hasn't been synced yet → sync first
  if (!token) return <Navigate to="/auth-callback" replace />;

  return children;
}

// ─── Wrong network banner ────────────────────────────────────────────────────
const SEPOLIA_CHAIN_ID = "0xaa36a7";

function NetworkBanner() {
  const [wrongNetwork, setWrongNetwork] = useState(false);

  useEffect(() => {
    const check = async () => {
      if (!window.ethereum) return;
      const chainId = await window.ethereum.request({ method: "eth_chainId" });
      setWrongNetwork(chainId !== SEPOLIA_CHAIN_ID);
    };
    check();
    if (window.ethereum) {
      window.ethereum.on("chainChanged", (id) => setWrongNetwork(id !== SEPOLIA_CHAIN_ID));
    }
  }, []);

  const switchToSepolia = async () => {
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: SEPOLIA_CHAIN_ID }],
      });
    } catch (e) {
      console.warn("Could not switch network:", e.message);
    }
  };

  if (!wrongNetwork) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-amber-500 text-black text-center text-xs font-bold py-2 px-4 flex items-center justify-center gap-3">
      ⚠️ Wrong Network — SwaRojgar runs on Ethereum Sepolia Testnet
      <button
        onClick={switchToSepolia}
        className="px-3 py-1 bg-black text-amber-400 rounded-full text-xs font-bold hover:bg-gray-900 transition-colors"
      >
        Switch to Sepolia
      </button>
    </div>
  );
}

function App() {
  return (
    <Router>
      <NetworkBanner />
      <Routes>
        {/* ── Public routes ─────────────────────────────────────────── */}
        <Route path="/"        element={<LandingPage />} />
        <Route path="/login/*" element={<Login />} />
        <Route path="/signup/*" element={<SignUp />} />

        {/* ── Post-auth routes ───────────────────────────────────────── */}
        <Route path="/auth-callback" element={<AuthCallback />} />
        <Route path="/onboarding"    element={<Onboarding />} />

        {/* ── Protected routes ──────────────────────────────────────── */}
        <Route path="/home"             element={<PrivateRoute><Home /></PrivateRoute>} />
        <Route path="/profile"          element={<PrivateRoute><Profile /></PrivateRoute>} />
        <Route path="/clientprofile"    element={<PrivateRoute><ClientProfile /></PrivateRoute>} />
        <Route path="/client-dashboard"     element={<PrivateRoute><ClientDashboard /></PrivateRoute>} />
        <Route path="/freelancer-dashboard" element={<PrivateRoute><FreelancerDashboard /></PrivateRoute>} />
        <Route path="/search"           element={<PrivateRoute><SearchPage /></PrivateRoute>} />
        <Route path="/customer-jobs"    element={<PrivateRoute><CustomerJobs /></PrivateRoute>} />
        <Route path="/freelancer-jobs"  element={<PrivateRoute><FreelancerJobs /></PrivateRoute>} />
        <Route path="/work-submission"  element={<PrivateRoute><WorkSubmission /></PrivateRoute>} />
        <Route path="/ResolutionCenter" element={<PrivateRoute><ResolutionCenter /></PrivateRoute>} />

        {/* ── Catch-all ─────────────────────────────────────────────── */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
