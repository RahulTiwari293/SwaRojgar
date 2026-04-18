import React from "react";
import { SignIn } from "@clerk/clerk-react";
import logo from "./assets/logo.png";

export default function Login() {
  return (
    <div className="min-h-screen flex bg-white dark:bg-gray-950">

      {/* ── Left branding panel ─────────────────────────────────────────── */}
      <div className="hidden lg:flex w-1/2 bg-black flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: "radial-gradient(circle, #ffffff18 1.5px, transparent 1.5px)", backgroundSize: "28px 28px" }} />
        <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full border border-white/5" />
        <div className="absolute -bottom-16 -right-16 w-[350px] h-[350px] rounded-full border border-white/5" />

        <div className="relative">
          <img src={logo} alt="SwaRojgar" className="h-9 w-auto object-contain brightness-0 invert" />
        </div>

        <div className="relative space-y-6">
          <h1 className="text-5xl font-black text-white leading-tight">
            The future of<br />freelancing is<br />on-chain.
          </h1>
          <p className="text-white/50 text-lg leading-relaxed max-w-sm">
            Trustless escrow, AI arbitration, and Kleros Court — all in one platform.
          </p>
          <div className="grid grid-cols-3 gap-6 pt-4">
            {[["100%","Trustless"],["3-Tier","Dispute System"],["SRT","Token Rewards"]].map(([val, label]) => (
              <div key={label}>
                <p className="text-2xl font-black text-white">{val}</p>
                <p className="text-white/40 text-xs mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-white/20 text-xs">© 2025 SwaRojgar. Decentralized. Transparent.</p>
      </div>

      {/* ── Right: Clerk SignIn ──────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-8">
            <img src={logo} alt="SwaRojgar" className="h-8 w-auto object-contain dark:brightness-0 dark:invert" />
          </div>
          <SignIn
            routing="path"
            path="/login"
            afterSignInUrl="/auth-callback"
            signUpUrl="/signup"
            appearance={{
              elements: {
                rootBox: "w-full",
                card: "bg-transparent shadow-none p-0",
                headerTitle: "text-gray-900 dark:text-white font-black text-2xl",
                headerSubtitle: "text-gray-400 dark:text-white/40 text-sm",
                socialButtonsBlockButton: "border border-white/10 bg-white/5 hover:bg-white/10 text-white rounded-xl",
                formButtonPrimary: "bg-black dark:bg-white text-white dark:text-black font-bold rounded-xl hover:bg-gray-800",
                formFieldInput: "bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-xl px-4 py-2.5 text-sm",
                formFieldLabel: "text-gray-500 dark:text-white/40 text-xs font-semibold uppercase tracking-wide",
                footerActionLink: "text-black dark:text-white font-bold",
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}
