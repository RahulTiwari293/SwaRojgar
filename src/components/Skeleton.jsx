/**
 * Skeleton.jsx — Loading Skeleton Components
 *
 * Prevents blank screens during blockchain/API data fetches.
 * Uses a shimmer animation to signal loading state.
 *
 * Exports:
 *   <SkeletonGigCard />     — Gig card placeholder
 *   <SkeletonDisputePanel /> — Resolution center placeholder
 *   <SkeletonText lines={3} /> — Generic text line skeleton
 *   <SkeletonBox h="h-32" /> — Generic box skeleton
 */

import React from "react";

// ─── Shimmer base ─────────────────────────────────────────────────────────────
const shimmer = "animate-pulse bg-white/8 rounded-xl";

export function SkeletonBox({ h = "h-16", w = "w-full", className = "" }) {
    return <div className={`${shimmer} ${h} ${w} ${className}`} />;
}

export function SkeletonText({ lines = 3, className = "" }) {
    return (
        <div className={`space-y-2 ${className}`}>
            {Array.from({ length: lines }).map((_, i) => (
                <div
                    key={i}
                    className={`${shimmer} h-4`}
                    style={{ width: `${100 - i * 15}%` }}
                />
            ))}
        </div>
    );
}

export function SkeletonGigCard() {
    return (
        <div className="rounded-2xl border border-white/8 bg-white/4 p-5 space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div className="space-y-2 flex-1">
                    <SkeletonBox h="h-5" w="w-3/4" />
                    <SkeletonBox h="h-3" w="w-1/2" />
                </div>
                <SkeletonBox h="h-6" w="w-20" className="rounded-full" />
            </div>

            {/* Body */}
            <SkeletonText lines={2} />

            {/* Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-white/5">
                <SkeletonBox h="h-4" w="w-24" />
                <SkeletonBox h="h-8" w="w-20" className="rounded-xl" />
            </div>
        </div>
    );
}

export function SkeletonDisputePanel() {
    return (
        <div className="space-y-6">
            {/* Gig overview */}
            <div className="rounded-2xl border border-white/8 bg-white/4 p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <SkeletonBox h="h-6" w="w-40" />
                    <SkeletonBox h="h-6" w="w-24" className="rounded-full" />
                </div>
                {/* Stepper */}
                <div className="flex items-center gap-2 py-4">
                    {[1, 2, 3, 4, 5].map(i => (
                        <React.Fragment key={i}>
                            <SkeletonBox h="h-10" w="w-10" className="rounded-full shrink-0" />
                            {i < 5 && <div className="flex-1 h-0.5 bg-white/6 rounded" />}
                        </React.Fragment>
                    ))}
                </div>
                {/* Stats row */}
                <div className="grid grid-cols-3 gap-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="space-y-1">
                            <SkeletonBox h="h-3" w="w-16" />
                            <SkeletonBox h="h-5" w="w-24" />
                        </div>
                    ))}
                </div>
            </div>

            {/* AI Card skeleton */}
            <div className="rounded-2xl border border-white/8 bg-white/4 p-6 space-y-4">
                <div className="flex items-center gap-3">
                    <SkeletonBox h="h-10" w="w-10" className="rounded-full" />
                    <div className="space-y-1 flex-1">
                        <SkeletonBox h="h-4" w="w-40" />
                        <SkeletonBox h="h-3" w="w-28" />
                    </div>
                    <SkeletonBox h="h-6" w="w-28" className="rounded-full" />
                </div>
                <SkeletonBox h="h-2" />
                <SkeletonText lines={3} />
                <div className="grid grid-cols-2 gap-3">
                    <SkeletonBox h="h-20" />
                    <SkeletonBox h="h-20" />
                </div>
            </div>
        </div>
    );
}

export function SkeletonNavbar() {
    return (
        <div className="h-16 border-b border-white/8 bg-black/60 backdrop-blur-xl flex items-center px-6 gap-4">
            <SkeletonBox h="h-8" w="w-32" />
            <div className="flex-1" />
            <SkeletonBox h="h-8" w="w-24" className="rounded-full" />
            <SkeletonBox h="h-8" w="w-8" className="rounded-full" />
        </div>
    );
}
