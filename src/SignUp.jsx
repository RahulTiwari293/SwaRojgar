import React from "react";
import { SignUp } from "@clerk/clerk-react";
import logo from "./assets/logo.png";

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex bg-[#0a0a0a]">

      {/* ── Left branding panel ─────────────────────────────────────────── */}
      <div className="hidden lg:flex w-5/12 bg-black flex-col justify-between p-14 relative overflow-hidden border-r border-white/5 shrink-0">
        {/* dot grid */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: "radial-gradient(circle, #ffffff14 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
        {/* glow orbs */}
        <div className="absolute top-1/4 -right-20 w-80 h-80 bg-white/3 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/3 -left-10 w-64 h-64 bg-white/2 rounded-full blur-3xl pointer-events-none" />

        <div className="relative">
          <img src={logo} alt="SwaRojgar" className="h-9 w-auto object-contain brightness-0 invert" />
        </div>

        <div className="relative space-y-8">
          <div>
            <p className="text-white/40 text-xs font-bold tracking-widest uppercase mb-4">Join SwaRojgar</p>
            <h1 className="text-4xl font-black text-white leading-[1.1] tracking-tight">
              Start earning<br />on your own<br />
              <span className="text-white/40">terms.</span>
            </h1>
          </div>
          <p className="text-white/40 text-base leading-relaxed max-w-xs">
            India's first decentralized gig platform. Work, get paid, stay protected.
          </p>
          <div className="space-y-4 pt-2">
            {[
              ["🔐", "Escrow-protected payments", "Funds locked until work is approved"],
              ["🤖", "AI dispute resolution",     "Mistral AI reviews disputes fairly"],
              ["⚖️", "Kleros Court fallback",     "Decentralized jurors as final say"],
            ].map(([icon, title, desc]) => (
              <div key={title} className="flex items-start gap-4 p-3 rounded-xl bg-white/3 border border-white/6">
                <span className="text-xl mt-0.5">{icon}</span>
                <div>
                  <p className="text-white/80 text-sm font-semibold">{title}</p>
                  <p className="text-white/35 text-xs mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-white/15 text-xs">© 2025 SwaRojgar. Built on Ethereum Sepolia.</p>
      </div>

      {/* ── Right: Clerk SignUp ──────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center px-6 py-10 overflow-y-auto bg-[#0a0a0a]">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-6">
            <img src={logo} alt="SwaRojgar" className="h-8 w-auto object-contain brightness-0 invert" />
          </div>
          <SignUp
            routing="path"
            path="/signup"
            afterSignUpUrl="/onboarding"
            signInUrl="/login"
            appearance={{
              variables: {
                colorBackground:        "#111111",
                colorInputBackground:   "#1a1a1a",
                colorInputText:         "#ffffff",
                colorText:              "#ffffff",
                colorTextSecondary:     "rgba(255,255,255,0.45)",
                colorPrimary:           "#ffffff",
                colorDanger:            "#f87171",
                colorSuccess:           "#4ade80",
                colorNeutral:           "#ffffff",
                borderRadius:           "12px",
                fontFamily:             "inherit",
                fontSize:               "14px",
              },
              elements: {
                rootBox:                "w-full",
                card:                   "bg-[#111111] border border-white/8 shadow-2xl rounded-2xl p-8",
                headerTitle:            "text-white font-black text-2xl",
                headerSubtitle:         "text-white/40 text-sm",
                socialButtonsBlockButton: "!border !border-white/10 !bg-white/5 hover:!bg-white/10 !text-white !rounded-xl !transition-all",
                socialButtonsBlockButtonText: "!text-white !font-semibold",
                dividerLine:            "!bg-white/10",
                dividerText:            "!text-white/30 !text-xs",
                formFieldLabel:         "!text-white/50 !text-xs !font-semibold !uppercase !tracking-wide",
                formFieldInput:         "!bg-white/5 !border !border-white/10 !text-white !rounded-xl !px-4 !py-2.5 !text-sm focus:!border-white/30 focus:!ring-0 !transition-colors",
                formButtonPrimary:      "!bg-white hover:!bg-gray-100 !text-black !font-bold !rounded-xl !transition-all hover:!scale-[1.02] !shadow-lg",
                footerActionText:       "!text-white/40 !text-sm",
                footerActionLink:       "!text-white !font-bold hover:!text-white/80",
                identityPreviewText:    "!text-white",
                identityPreviewEditButton: "!text-white/50",
                formFieldSuccessText:   "!text-green-400",
                formFieldErrorText:     "!text-red-400",
                alertText:              "!text-white",
                otpCodeFieldInput:      "!bg-white/5 !border !border-white/10 !text-white !rounded-xl",
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}
