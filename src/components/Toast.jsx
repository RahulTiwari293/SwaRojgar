/**
 * Toast.jsx — Global Notification System
 *
 * Renders the toast queue from GigContext.
 * Place <ToastContainer /> once near the root of your app (in App.jsx).
 *
 * Toast types: 'success' | 'error' | 'warning' | 'info' | 'loading'
 */

import React, { useEffect, useState } from "react";
import { useGig } from "../context/GigContext";

// ─── Individual Toast ─────────────────────────────────────────────────────────
function Toast({ toast }) {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        // Animate in
        const t = setTimeout(() => setVisible(true), 10);
        // Animate out before removal
        const t2 = setTimeout(() => setVisible(false), toast.duration - 300);
        return () => { clearTimeout(t); clearTimeout(t2); };
    }, [toast.duration]);

    const styles = {
        success: {
            border: "border-emerald-500/40",
            bg:     "bg-emerald-950/90",
            icon:   "✅",
            text:   "text-emerald-200"
        },
        error: {
            border: "border-red-500/40",
            bg:     "bg-red-950/90",
            icon:   "❌",
            text:   "text-red-200"
        },
        warning: {
            border: "border-amber-500/40",
            bg:     "bg-amber-950/90",
            icon:   "⚠️",
            text:   "text-amber-200"
        },
        info: {
            border: "border-violet-500/30",
            bg:     "bg-slate-900/90",
            icon:   "ℹ️",
            text:   "text-white/80"
        },
        loading: {
            border: "border-cyan-500/30",
            bg:     "bg-slate-900/90",
            icon:   "⏳",
            text:   "text-cyan-200"
        }
    };

    const s = styles[toast.type] || styles.info;

    return (
        <div
            className={`
                flex items-start gap-3 px-4 py-3 rounded-2xl border backdrop-blur-xl
                shadow-2xl max-w-sm w-full
                transition-all duration-300 ease-out
                ${s.bg} ${s.border} ${s.text}
                ${visible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-8"}
            `}
        >
            <span className="text-base shrink-0 mt-0.5">
                {toast.type === "loading" ? (
                    <span className="inline-block animate-spin">⏳</span>
                ) : s.icon}
            </span>
            <p className="text-sm leading-relaxed">{toast.message}</p>
        </div>
    );
}

// ─── Toast Container ──────────────────────────────────────────────────────────
export default function ToastContainer() {
    const { toasts } = useGig();

    return (
        <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
            {toasts.map(t => <Toast key={t.id} toast={t} />)}
        </div>
    );
}
