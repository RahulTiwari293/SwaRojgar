import React, { useState, useEffect } from "react";
import { Pie } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { IoLogoInstagram } from "react-icons/io5";
import { BiLogoLinkedin } from "react-icons/bi";
import Navbar from "./navbar";
import ProfilePhotoUpload from "./components/ProfilePhotoUpload";
import WalletSection from "./components/blockchain/WalletSection";
import axios from "axios";

ChartJS.register(ArcElement, Tooltip, Legend);

function ClientProfile() {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [srtBalance, setSrtBalance] = useState('0');

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userId = localStorage.getItem("userId");
        if (!userId) {
          console.error("No userId found in localStorage");
          setLoading(false);
          return;
        }

        const response = await axios.get(`http://localhost:5010/api/users/${userId}`);
        setUserData(response.data);
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  const handlePhotoUpdated = (photoPath) => {
    setUserData(prev => ({ ...prev, profilePhoto: photoPath }));
  };

  const handleBalanceUpdate = (balance) => {
    setSrtBalance(balance);
  };

  const data = {
    labels: ["SEO", "Web Development", "Logo Design"],
    datasets: [
      {
        data: [300, 500, 200],
        backgroundColor: ["#FF5722", "#03A9F4", "#8BC34A"],
        borderColor: ["#ffffff"],
        borderWidth: 2,
        hoverOffset: 10,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
        labels: {
          font: {
            size: 14,
          },
          color: "#333",
        },
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.label || "";
            const value = context.raw || 0;
            return `${label}: ${value}`;
          },
        },
        backgroundColor: "rgba(0,0,0,0.7)",
        titleColor: "#fff",
        bodyColor: "#fff",
      },
    },
    animation: {
      animateScale: true,
      animateRotate: true,
    },
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-10 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-10">
      <div className="p-6 mx-auto bg-white shadow-md rounded-lg transition duration-500 hover:shadow-xl ">
        <div className="flex gap-20 items-center justify-center">
          <div className="w-1/4 h-screen p-4 bg-gradient-to-r from-[#cd97e1] to-white-300 text-white rounded-lg">
            <div className="text-center mb-4">
              <div className="flex justify-center my-10">
                <ProfilePhotoUpload
                  userId={userData?._id}
                  currentPhoto={userData?.profilePhoto ? `http://localhost:5010/${userData.profilePhoto}` : null}
                  onPhotoUpdated={handlePhotoUpdated}
                />
              </div>
              <h2 className="mt-4 text-3xl font-bold text-gray-700">
                {userData ? `${userData.firstName} ${userData.lastName}` : "User Name"}
              </h2>
            </div>

            {/* Wallet Section */}
            <div className="mb-6">
              <WalletSection onBalanceUpdate={handleBalanceUpdate} userType="customer" />

              {/* Quick Actions */}
              <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <button
                  onClick={() => window.location.href = '/customer-jobs'}
                  style={{
                    flex: '1',
                    minWidth: '180px',
                    padding: '0.9rem 1.2rem',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.75rem',
                    fontSize: '0.95rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                  onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                >
                  💼 My Posted Jobs
                </button>
                <button
                  onClick={() => window.location.href = '/'}
                  style={{
                    flex: '1',
                    minWidth: '180px',
                    padding: '0.9rem 1.2rem',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.75rem',
                    fontSize: '0.95rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                  onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                >
                  ➕ Post New Job
                </button>
              </div>
            </div>

            <div className="text-sm p-[2vw] pt-4 text-gray-700">
              <p className="mb-5">6 Churchgate, Mumbai</p>
              <p className="mb-5">{userData?.email || "email@example.com"}</p>
              <p className="mb-5">Cell: {userData?.phoneNumber || "+91 XXXXXXXXXX"}</p>
            </div>
            <div>
              <h5 className="font-semibold text-3xl pl-[2vw] text-gray-700">
                Preferred Freelancers
              </h5>
              <div className="text-md p-[2vw] pt-4 text-gray-700">
                <ul className="list-disc list-inside">
                  <li className="mb-5">Web Developer</li>
                  <li className="mb-5">Graphic Designer</li>
                  <li className="mb-5"> SEO Specialist</li>
                </ul>
              </div>
            </div>
            <div className="flex justify-start -mt-6 gap-5 px-6 text-gray-700">
              <IoLogoInstagram className="text-2xl hover:cursor-pointer hover:text-green-500 transition-all ease" />
              <BiLogoLinkedin className="text-2xl hover:cursor-pointer hover:text-green-500 transition-all ease" />
            </div>
          </div>

          <div className="w-full md:w-2/3 p-4">
            <div className="flex items-center mb-4 gap-[19.2vw]">
              <div>
                <h3 className="text-xl font-semibold">Freelance Stats</h3>
                <p className="text-sm text-gray-600">Overall</p>
              </div>
              <div>
                <h3 className="text-xl font-semibold">Job Posted History</h3>
                <p className="text-sm text-gray-600">All Time</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-gray-100 p-10 rounded-lg shadow flex flex-col items-center">
                <div className="relative w-full h-[300px]">
                  <Pie data={data} options={options} />
                </div>
                <p className="text-sm mt-4">Skills Distribution</p>
              </div>
              <div className="bg-gray-100 rounded-lg shadow">
                <h4 className="text-lg">
                  <h4 className="text-lg font-semibold mb-5 p-4 pb-2">
                    Recent Job Posts
                  </h4>
                  <ul className="p-4 pb-2">
                    <li className="mb-2 border-2 p-2 border-green-400">
                      Web Development for E-commerce - Completed
                    </li>
                    <li className="mb-2 border-2 p-2 border-green-400">
                      Logo Design for Startup - In Progress
                    </li>
                    <li className="mb-2 border-2 p-2 border-green-400">
                      SEO Optimization for Blog - Completed
                    </li>
                    <li className="mb-2 border-2 p-2 border-green-400">
                      Mobile App Design - In Progress
                    </li>
                    <li className="mb-2 border-2 p-2 border-green-400">
                      Custom WordPress Theme Development - Completed
                    </li>
                  </ul>
                  <a
                    href="#"
                    className="text-sm pl-4 text-blue-600 hover:underline"
                  >
                    See more
                  </a>
                </h4>
              </div>
            </div>

            <div className="bg-gray-100 p-4 rounded-lg shadow">
              <h4 className="text-lg font-semibold">
                {parseFloat(srtBalance) > 0
                  ? `${(1000000 - parseFloat(srtBalance)).toFixed(2)} SRT`
                  : '0 SRT'}
              </h4>
              <p className="text-sm text-gray-500">Total Spent on Projects</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ClientProfile;
