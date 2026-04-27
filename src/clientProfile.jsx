import React, { useState, useEffect } from "react";
import Navbar from "./navbar";
import ProfilePhotoUpload from "./components/ProfilePhotoUpload";
import axios from "axios";

const API = import.meta.env.VITE_BACKEND_URL ?? "http://localhost:5010";

export default function ClientProfile() {
  const [userData, setUserData]   = useState(null);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    const userId = localStorage.getItem("userId");
    if (!userId) { setLoading(false); return; }
    axios.get(`${API}/api/users/${userId}`)
      .then(r => setUserData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handlePhotoUpdated = (path) => setUserData(p => ({ ...p, profilePhoto: path }));

  if (loading) return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-black dark:border-white border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const name = userData ? `${userData.firstName} ${userData.lastName}` : "User";
  const initials = userData ? `${userData.firstName?.[0] || ""}${userData.lastName?.[0] || ""}` : "?";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 py-10">

        {/* ── Header card ─────────────────────────────────────── */}
        <div className="bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-3xl p-8 mb-6 flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <div className="shrink-0">
            <ProfilePhotoUpload
              userId={userData?._id}
              currentPhoto={userData?.profilePhoto ? `${API}/${userData.profilePhoto}` : null}
              onPhotoUpdated={handlePhotoUpdated}
            />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-1">{name}</h1>
            <p className="text-gray-500 dark:text-white/40 text-sm mb-3">Client · SwaRojgar</p>
            <div className="flex flex-wrap gap-3 justify-center sm:justify-start">
              {userData?.email && (
                <span className="px-3 py-1.5 rounded-full bg-gray-100 dark:bg-white/8 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-white/60 text-xs">
                  ✉️ {userData.email}
                </span>
              )}
              {userData?.phoneNumber && (
                <span className="px-3 py-1.5 rounded-full bg-gray-100 dark:bg-white/8 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-white/60 text-xs">
                  📱 {userData.phoneNumber}
                </span>
              )}
            </div>
          </div>

          <div className="flex gap-3">
            <a href="/customer-jobs"
              className="px-5 py-2.5 rounded-xl bg-black dark:bg-white text-white dark:text-black font-semibold text-sm hover:bg-gray-800 dark:hover:bg-gray-100 transition-all">
              💼 My Jobs
            </a>
          </div>
        </div>

        {/* ── Stats grid ──────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { icon: "📋", label: "Jobs Posted",  val: userData?.totalGigsCompleted || 0 },
            { icon: "✅", label: "Completed",    val: 0 },
            { icon: "⭐", label: "Avg Rating",   val: userData?.averageRating ? userData.averageRating.toFixed(1) : "—" },
            { icon: "💰", label: "Total Spent",  val: `${userData?.totalEarnedSRT || 0} SRT` },
          ].map(s => (
            <div key={s.label}
              className="bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl p-5 text-center hover:shadow-md transition-shadow">
              <div className="text-2xl mb-2">{s.icon}</div>
              <div className="text-2xl font-black text-gray-900 dark:text-white">{s.val}</div>
              <div className="text-gray-400 dark:text-white/30 text-xs mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── Preferred categories ────────────────────────────── */}
        <div className="bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-3xl p-6">
          <h2 className="text-lg font-black text-gray-900 dark:text-white mb-4">Frequently Hired For</h2>
          <div className="flex flex-wrap gap-2">
            {["Web Development", "Graphic Design", "SEO Optimization", "Mobile App", "Content Writing"].map(skill => (
              <span key={skill}
                className="px-3 py-1.5 rounded-full border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-gray-700 dark:text-white/70 text-xs font-medium">
                {skill}
              </span>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
