/**
 * AuthCallback.jsx
 *
 * Landing page after every Clerk sign-in.
 * 1. Gets Clerk session token
 * 2. Calls POST /api/users/clerk-sync to find/create MongoDB user
 * 3. Stores our JWT + userId + userType in localStorage
 * 4. Redirects to the right dashboard (or /onboarding for new users)
 */

import React, { useEffect, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";

const BACKEND = import.meta.env.VITE_BACKEND_URL || "http://localhost:5010";

export default function AuthCallback() {
  const { getToken, isLoaded } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isLoaded) return;

    const sync = async () => {
      try {
        const clerkToken = await getToken();
        const res = await fetch(`${BACKEND}/api/users/clerk-sync`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${clerkToken}`,
          },
        });

        const data = await res.json();

        if (res.status === 202 && data.needsOnboarding) {
          // New user — send to onboarding to pick role
          navigate("/onboarding", { state: { email: data.email, firstName: data.firstName, lastName: data.lastName } });
          return;
        }

        if (!res.ok) throw new Error(data.message || "Sync failed");

        // Store our JWT like the old login did
        localStorage.setItem("token",     data.token);
        localStorage.setItem("userId",    data.userId);
        localStorage.setItem("userType",  data.userType);
        if (data.firstName) localStorage.setItem("firstName", data.firstName);

        if (data.userType === "client") navigate("/client-dashboard");
        else navigate("/freelancer-dashboard");

      } catch (e) {
        console.error("Auth sync failed:", e.message);
        setError(e.message);
      }
    };

    sync();
  }, [isLoaded, getToken, navigate]);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-red-400 font-semibold">Auth sync failed: {error}</p>
          <button onClick={() => navigate("/login")}
            className="px-6 py-2 bg-white text-black rounded-xl font-bold text-sm">
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="w-10 h-10 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-white/60 text-sm">Setting up your account...</p>
      </div>
    </div>
  );
}
