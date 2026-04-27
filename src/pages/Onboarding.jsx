/**
 * Onboarding.jsx
 *
 * Shown to new users after Clerk signup to collect the role (client/freelancer)
 * that Clerk doesn't know about. Calls clerk-sync with the chosen role to create
 * the MongoDB user record and get our JWT.
 */

import React, { useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useNavigate, useLocation } from "react-router-dom";
import logo from "../assets/logo.png";

const BACKEND = import.meta.env.VITE_BACKEND_URL ?? "http://localhost:5010";

export default function Onboarding() {
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const { email = "", firstName = "", lastName = "" } = location.state || {};
  const [userType, setUserType] = useState("client");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleFinish = async () => {
    setError("");
    setLoading(true);
    try {
      const clerkToken = await getToken();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout (allow for cold start)
      const res = await fetch(`${BACKEND}/api/users/clerk-sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${clerkToken}`,
        },
        body: JSON.stringify({ userType }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Setup failed");

      localStorage.setItem("token",    data.token);
      localStorage.setItem("userId",   data.userId);
      localStorage.setItem("userType", data.userType);
      if (data.firstName) localStorage.setItem("firstName", data.firstName);

      if (data.userType === "client") navigate("/client-dashboard");
      else navigate("/freelancer-dashboard");

    } catch (e) {
      if (e.name === 'AbortError') {
        setError('Server is starting up, please try again in a few seconds.');
      } else {
        setError(e.message || 'Network error — check backend URL and CORS settings.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      {/* Ambient */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute top-1/3 right-1/4 w-96 h-96 rounded-full bg-primary/5 blur-3xl animate-float-slow" />
        <div className="absolute bottom-1/4 left-1/4 w-72 h-72 rounded-full bg-accent/4 blur-3xl" />
      </div>

      <div className="w-full max-w-md space-y-7 animate-fade-in">
        <div className="text-center">
          <img src={logo} alt="SwaRojgar" className="h-9 w-auto object-contain brightness-0 invert mx-auto mb-6" />
          <h1 className="text-display text-3xl font-semibold text-foreground">One last step</h1>
          <p className="text-muted-foreground text-sm mt-2">
            Welcome{firstName ? `, ${firstName}` : ""}! How will you use SwaRojgar?
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-[var(--destructive-bg)] border border-destructive/20 text-destructive text-sm text-center">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          {[
            { val:"client",     icon:"🧑‍💼", title:"I'm a Client",     desc:"Post gigs and hire talent" },
            { val:"freelancer", icon:"👷",   title:"I'm a Freelancer", desc:"Work on gigs and earn SRT" },
          ].map(opt => (
            <button key={opt.val} type="button" onClick={() => setUserType(opt.val)}
              className={`p-5 rounded-2xl border-2 text-left transition-all duration-200 shadow-card
                ${userType === opt.val
                  ? "border-primary bg-primary/10 scale-[1.02]"
                  : "border-hairline bg-surface text-muted-foreground hover:border-primary/40 hover:bg-surface-2"}`}>
              <div className="text-3xl mb-3">{opt.icon}</div>
              <div className={`font-semibold text-sm mb-1 ${userType === opt.val ? "text-foreground" : "text-foreground/80"}`}>
                {opt.title}
              </div>
              <div className="text-xs text-muted-foreground leading-relaxed">{opt.desc}</div>
            </button>
          ))}
        </div>

        <button onClick={handleFinish} disabled={loading}
          className="w-full py-4 rounded-2xl bg-gold text-white font-semibold text-base
            shadow-glow hover:opacity-90 transition-all hover:scale-[1.01]
            disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100">
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>
              Setting up��
            </span>
          ) : `Continue as ${userType === "client" ? "Client →" : "Freelancer →"}`}
        </button>

        <p className="text-muted-foreground/50 text-xs text-center">
          You can always switch roles later from your settings.
        </p>
      </div>
    </div>
  );
}
