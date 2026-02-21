import React from "react";
import Navbar from "./navbar";
import Leftbar from "./leftbar";
import Postbar from "./Postbar";
import Rightbar from "./Rightbar";
import DashboardWidgets from "./components/DashboardWidgets";

function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Dashboard Widgets - Full Width with Max Container */}
      <div className="w-full bg-white border-b border-gray-200">
        <DashboardWidgets />
      </div>

      {/* Main Content Grid - Consistent Width */}
      <div className="max-w-[1400px] mx-auto px-6 py-6">
        <div className="flex gap-6">
          <div className="w-1/4">
            <Leftbar />
          </div>
          <div className="w-2/4">
            <Postbar />
          </div>
          <div className="w-1/4">
            <Rightbar />
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;
