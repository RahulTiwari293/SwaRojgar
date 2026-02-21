import React from "react";
import "./index.css";
import Login from "./Login";
import SignUp from "./SignUp";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./Home.jsx";
import AdvancedEscrowDemo from "./EscrowAccount.jsx";
import CustomerEscrowInterface from "./customerEscrow.jsx";
import ResolutionCenter from "./ResolutionCenter.jsx";
import Profile from "./freelancerProfile.jsx";
import ClientProfile from "./clientProfile.jsx";
import ClientDashboard from "./ClientDashboard";
import SearchPage from "./search.jsx";
import WorkSubmission from "./pages/WorkSubmission.jsx";
import CustomerJobs from "./pages/CustomerJobs.jsx";
import FreelancerJobs from "./pages/FreelancerJobs.jsx";

function App() {
  return (
    <Router>
      <Routes>
        {/* made this as the first page  */}
        <Route path="/" element={<Home />} />
        <Route path="/custescrow" element={<CustomerEscrowInterface />} />
        <Route path="/escrow" element={<AdvancedEscrowDemo />} />
        <Route path="/ResolutionCenter" element={<ResolutionCenter />} />

        {/* <Route path="/freelancer-dashboard" element={<Home />} /> */}
        <Route path="/client-dashboard" element={<ClientDashboard />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/login" element={<Login />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/clientprofile" element={<ClientProfile />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/work-submission" element={<WorkSubmission />} />
        <Route path="/customer-jobs" element={<CustomerJobs />} />
        <Route path="/freelancer-jobs" element={<FreelancerJobs />} />
      </Routes>
    </Router>
  );
}

export default App;
