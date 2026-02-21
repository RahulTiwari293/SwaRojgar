import React, { useState } from "react";
import loginImage from "./assets/loginpage.png";
import { FaGooglePlusG } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { FaMeta } from "react-icons/fa6";
import { BsMicrosoft } from "react-icons/bs";

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch("http://localhost:5010/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      if (response.ok) {
        console.log("Login successful:", data);

        // Save userId to localStorage for creating posts
        if (data.userId) {
          localStorage.setItem("userId", data.userId);
        }
        if (data.userType) {
          localStorage.setItem("userType", data.userType);
        }

        if (data.userType === 'client') {
          navigate("/client-dashboard");
        } else if (data.userType === 'freelancer') {
          navigate("/");
        }
      } else {
        console.error("Login failed:", data.message);
        alert("Invalid email or password.");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("An error occurred during login.");
    }
  };


  return (
    <div className="m-[5vw] ml-[10vw] w-[90vw] max-w-[1200px] flex justify-center items-center border-2 p-[2vw] rounded-3xl bg-gradient-to-r from-purple-300 to-blue-300 shadow-lg transition-all duration-500 ease-in-out transform ">
      {/* Image section */}
      <div className="hidden md:block w-1/2 p-5">
        <img src={loginImage} alt="Login Page" className="w-full rounded-xl shadow-xl hover:shadow-2xl transition-shadow duration-500" />
      </div>
      {/* Main section */}
      <div className="w-full md:w-1/2 p-5">
        <h4 className="text-5xl font-bold mb-4 text-white">Hello Again!</h4>
        <h5 className="text-lg mb-6 text-white">Welcome back, you've been missed!</h5>
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full md:w-3/4 mb-4 p-4 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all duration-300"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full md:w-3/4 mb-6 p-4 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all duration-300"
          />
          <button
            type="submit"
            className="w-full md:w-3/4 p-4 rounded-lg bg-purple-500 hover:bg-purple-600 transition-all duration-300 transform hover:scale-105 text-white font-bold"
          >
            Login
          </button>
        </form>
        <div className="mt-4 text-center md:w-3/4">
          Don't have an account?{' '}
          <button
            onClick={() => navigate("/signup")}
            className="text-purple-600 hover:underline font-semibold"
          >
            Sign up
          </button>
        </div>
        <div className="md:w-3/4 flex justify-center gap-8 mt-8">
          <button className="bg-white p-4 rounded-full transition-transform duration-500 hover:scale-110 shadow-lg hover:shadow-2xl">
            <FaGooglePlusG className="text-3xl text-red-500" />
          </button>
          <button className="bg-white p-4 rounded-full transition-transform duration-500 hover:scale-110 shadow-lg hover:shadow-2xl">
            <FaMeta className="text-3xl text-blue-500" />
          </button>
          <button className="bg-white p-4 rounded-full transition-transform duration-500 hover:scale-110 shadow-lg hover:shadow-2xl">
            <BsMicrosoft className="text-3xl text-green-500" />
          </button>
        </div>
      </div>

    </div>
  );
}

export default Login;
