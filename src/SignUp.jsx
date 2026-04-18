import React from "react";
import { SignUp } from "@clerk/clerk-react";
import logo from "./assets/logo.png";

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex bg-white dark:bg-gray-950">

      {/* ── Left branding panel ─────────────────────────────────────────── */}
      <div className="hidden lg:flex w-5/12 bg-black flex-col justify-between p-12 relative overflow-hidden shrink-0">
        <div className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: "radial-gradient(circle, #ffffff18 1.5px, transparent 1.5px)", backgroundSize: "28px 28px" }} />
        <div className="absolute -top-32 -left-32 w-[400px] h-[400px] rounded-full border border-white/5" />
        <div className="absolute -bottom-20 -right-20 w-[300px] h-[300px] rounded-full border border-white/5" />

        <div className="relative">
          <img src={logo} alt="SwaRojgar" className="h-9 w-auto object-contain brightness-0 invert" />
        </div>

        <div className="relative space-y-6">
          <h1 className="text-4xl font-black text-white leading-tight">
            Start earning<br />on your own<br />terms.
          </h1>
          <p className="text-white/50 text-base leading-relaxed max-w-xs">
            Join thousands of freelancers and clients on India's first decentralized gig platform.
          </p>
          <div className="space-y-3 pt-2">
            {[
              ["🔐", "Escrow-protected payments"],
              ["🤖", "AI-powered dispute resolution"],
              ["⚖️", "Kleros Court as final fallback"],
            ].map(([icon, text]) => (
              <div key={text} className="flex items-center gap-3">
                <span className="text-lg">{icon}</span>
                <span className="text-white/60 text-sm">{text}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-white/20 text-xs">© 2025 SwaRojgar. Built on Ethereum Sepolia.</p>
      </div>

      {/* ── Right: Clerk SignUp ──────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center px-6 py-10 overflow-y-auto">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-6">
            <img src={logo} alt="SwaRojgar" className="h-8 w-auto object-contain dark:brightness-0 dark:invert" />
          </div>
          <SignUp
            routing="path"
            path="/signup"
            afterSignUpUrl="/onboarding"
            signInUrl="/login"
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
                identityPreviewText: "text-white",
                identityPreviewEditButton: "text-white/60",
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}
