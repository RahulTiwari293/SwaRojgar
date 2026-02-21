import React from "react";
import Navbar from "./navbar.jsx";
import Leftbar from "./leftbar.jsx";
import Postbar from "./postbarClient.jsx";
import Rightbar from "./rightbarClient.jsx";

function ClientDashboard() {
  return (
    <>
      {/* Navbar Opening */}
      <Navbar />
      <hr className="mt-5" />
      {/* Navbar Closing */}

      {/* Dashboard opening */}
      <div className="flex justify-around mt-[3vw] p-2">
        {/* Leftbar */}
        <Leftbar />
        {/* Postbar */}
        <Postbar />
        {/* Rightbar */}
        <Rightbar />
      </div>

      {/* AI Component */}
    </>
  );
}

export default ClientDashboard;
