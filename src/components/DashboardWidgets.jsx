import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API = import.meta.env.VITE_BACKEND_URL || "http://localhost:5010";

function DashboardWidgets() {
    const [userType, setUserType] = useState(null);
    const [stats, setStats] = useState({
        totalJobs: 0,
        activeJobs: 0,
        completedJobs: 0,
        totalAmount: 0,
        pendingReviews: 0,
    });
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const type = localStorage.getItem("userType");
        const id   = localStorage.getItem("userId");
        setUserType(type);
        if (id && type) {
            fetchStats(id, type);
        } else {
            setLoading(false);
        }
    }, []);

    const fetchStats = async (id, type) => {
        try {
            const endpoint = type === "client"
                ? `${API}/api/jobs/customer/${id}`
                : `${API}/api/jobs/freelancer/${id}`;
            const { data: jobs } = await axios.get(endpoint);
            setStats({
                totalJobs:      jobs.length,
                activeJobs:     jobs.filter(j => ["ACCEPTED","IN_PROGRESS","ASSIGNED"].includes(j.status)).length,
                completedJobs:  jobs.filter(j => j.status === "COMPLETED").length,
                totalAmount:    jobs.reduce((s, j) => s + (parseFloat(j.srtAmount) || 0), 0),
                pendingReviews: jobs.filter(j => j.status === "PROOF_SUBMITTED").length,
            });
        } catch (e) {
            console.error("Error fetching stats:", e);
        } finally {
            setLoading(false);
        }
    };

    const customerActions = [
        { title: "Post a Job",    desc: "Find the perfect freelancer", icon: "📝", action: () => navigate("/customer-jobs") },
        { title: "Manage Jobs",   desc: `${stats.activeJobs} active projects`, icon: "💼", action: () => navigate("/customer-jobs") },
        { title: "Review Work",   desc: `${stats.pendingReviews} submissions`, icon: "✅", action: () => navigate("/customer-jobs"), badge: stats.pendingReviews },
    ];

    const freelancerActions = [
        { title: "Find Work",       desc: "Browse available jobs",    icon: "🔍", action: () => navigate("/freelancer-jobs") },
        { title: "Active Projects", desc: `${stats.activeJobs} in progress`, icon: "💼", action: () => navigate("/freelancer-jobs") },
        { title: "Submit Work",     desc: "Upload completed work",    icon: "📤", action: () => navigate("/work-submission") },
    ];

    const actions = userType === "client" ? customerActions : freelancerActions;

    const statCards = [
        { icon: "📊", val: stats.totalJobs,          label: userType === "client" ? "Jobs Posted" : "Jobs Taken" },
        { icon: "⚡", val: stats.activeJobs,          label: "Active Projects" },
        { icon: "✅", val: stats.completedJobs,       label: "Completed" },
        { icon: "💰", val: `${stats.totalAmount.toFixed(0)} SRT`, label: userType === "client" ? "Total Spent" : "Total Earned" },
    ];

    if (loading) {
        return (
            <div className="max-w-[1400px] mx-auto px-6 py-4 flex items-center justify-center h-32">
                <div className="w-6 h-6 border-2 border-gray-300 dark:border-white/20 border-t-gray-800 dark:border-t-white rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="max-w-[1400px] mx-auto px-6 py-5 space-y-5">
            {/* Welcome Banner */}
            <div className="rounded-2xl bg-black dark:bg-white/5 border border-gray-800 dark:border-white/10 px-6 py-4 flex items-center justify-between gap-4">
                <div>
                    <h2 className="text-white dark:text-white font-bold text-lg">
                        {userType === "client" ? "👋 Welcome back, Client!" : "👋 Welcome back, Freelancer!"}
                    </h2>
                    <p className="text-white/60 text-sm mt-0.5">
                        {userType === "client"
                            ? "Find talented freelancers for your next project"
                            : "Discover exciting job opportunities and grow your career"}
                    </p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {statCards.map(s => (
                    <div key={s.label} className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-4 text-center">
                        <div className="text-2xl mb-1">{s.icon}</div>
                        <div className="text-xl font-black text-gray-900 dark:text-white">{s.val}</div>
                        <div className="text-xs text-gray-400 dark:text-white/30 mt-0.5">{s.label}</div>
                    </div>
                ))}
            </div>

            {/* Quick Actions */}
            <div>
                <h3 className="text-sm font-bold text-gray-500 dark:text-white/40 uppercase tracking-wider mb-3">Quick Actions</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {actions.map((action) => (
                        <button
                            key={action.title}
                            onClick={action.action}
                            className="relative flex items-center gap-4 p-4 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-gray-50 dark:hover:bg-white/10 hover:border-gray-300 dark:hover:border-white/20 transition-all text-left group"
                        >
                            <span className="text-2xl">{action.icon}</span>
                            <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm text-gray-900 dark:text-white">{action.title}</p>
                                <p className="text-xs text-gray-400 dark:text-white/40 truncate">{action.desc}</p>
                            </div>
                            {action.badge > 0 && (
                                <span className="w-6 h-6 rounded-full bg-black dark:bg-white text-white dark:text-black text-xs font-bold flex items-center justify-center shrink-0">
                                    {action.badge}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default DashboardWidgets;
