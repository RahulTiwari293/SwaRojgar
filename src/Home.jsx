import React from "react";
import Navbar from "./navbar";
import Leftbar from "./leftbar";
import Postbar from "./Postbar";
import Rightbar from "./Rightbar";

function Home() {
  return (
    <div className="min-h-screen bg-background transition-colors">
      <Navbar />

      <div className="max-w-[1400px] mx-auto px-6 py-6">
        <div className="flex gap-6">
          <div className="hidden lg:block w-1/4">
            <Leftbar />
          </div>
          <div className="flex-1 lg:w-2/4">
            <Postbar />
          </div>
          <div className="hidden xl:block w-1/4">
            <Rightbar />
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;
