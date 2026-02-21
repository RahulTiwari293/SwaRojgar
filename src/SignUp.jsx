import React, { useState } from "react";
import signupImage from "./assets/signup.png";
import { FaGooglePlusG } from "react-icons/fa";
import { useNavigate } from 'react-router-dom';
import { BsMicrosoft } from "react-icons/bs";
import { FaMeta } from "react-icons/fa6";

function SignUp() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        phoneNumber: "",
        userType: "client",
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch('http://localhost:5010/signup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            const data = await response.json();
            if (response.ok) {
                console.log("User registered:", data);

                // Save userId and userType to localStorage for creating posts
                if (data.userId) {
                    localStorage.setItem("userId", data.userId);
                }
                localStorage.setItem("userType", formData.userType);

                // Navigate to the correct dashboard based on userType
                if (formData.userType === "client") {
                    navigate("/client-dashboard");
                } else if (formData.userType === "freelancer") {
                    // navigate("/freelancer-dashboard");
                    navigate("/");
                }
            } else {
                console.error("Registration error:", data);
                alert("Registration failed: " + (data.message || "Unknown error"));
            }
        } catch (error) {
            console.error("Error:", error);
            alert("An error occurred during registration.");
        }
    };

    return (
        <div className="flex justify-center items-center min-h-screen bg-gradient-to-r from-purple-300 to-blue-300">
            <div className="m-[5vw] w-[90vw] max-w-[1200px] flex justify-center items-center border-2 p-[2vw] rounded-3xl bg-white shadow-lg transition-all duration-500 ease-in-out transform">
                <div className="hidden md:block w-1/2 p-2">
                    <img
                        src={signupImage}
                        alt="Sign Up Page"
                        className="w-full rounded-xl shadow-xl hover:shadow-2xl transition-shadow duration-500"
                    />
                </div>
                <div className="w-full md:w-1/2 p-5">
                    <h4 className="text-5xl font-bold mb-4 text-gray-800">Create Account</h4>
                    <h5 className="text-lg mb-6 text-gray-600">Join us and start your journey!</h5>
                    <form onSubmit={handleSubmit}>
                        <div className="flex gap-4 w-full md:w-3/4">
                            <input
                                type="text"
                                name="firstName"
                                placeholder="First Name"
                                value={formData.firstName}
                                onChange={handleChange}
                                className="w-1/2 p-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all duration-300"
                            />
                            <input
                                type="text"
                                name="lastName"
                                placeholder="Last Name"
                                value={formData.lastName}
                                onChange={handleChange}
                                className="w-1/2 p-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all duration-300"
                            />
                        </div>
                        <input
                            type="email"
                            name="email"
                            placeholder="Email"
                            value={formData.email}
                            onChange={handleChange}
                            className="w-full md:w-3/4 mt-4 p-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all duration-300"
                        />
                        <input
                            type="password"
                            name="password"
                            placeholder="Password"
                            value={formData.password}
                            onChange={handleChange}
                            className="w-full md:w-3/4 mt-4 p-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all duration-300"
                        />
                        <input
                            type="tel"
                            name="phoneNumber"
                            placeholder="Mobile Number"
                            value={formData.phoneNumber}
                            onChange={handleChange}
                            className="w-full md:w-3/4 mt-4 p-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all duration-300"
                        />

                        {/* Radio buttons for user type selection */}
                        <div className="flex items-center gap-4 mt-4 w-full md:w-3/4">
                            <label className="flex items-center">
                                <input
                                    type="radio"
                                    name="userType"
                                    value="client"
                                    checked={formData.userType === "client"}
                                    onChange={handleChange}
                                    className="mr-2"
                                />
                                Are you a client
                            </label>
                            <label className="flex items-center">
                                <input
                                    type="radio"
                                    name="userType"
                                    value="freelancer"
                                    checked={formData.userType === "freelancer"}
                                    onChange={handleChange}
                                    className="mr-2"
                                />
                                Are you a freelancer
                            </label>
                        </div>

                        <button
                            type="submit"
                            className="w-full md:w-3/4 mt-6 p-4 rounded-lg bg-purple-500 hover:bg-purple-600 transition-all duration-300 transform hover:scale-105 text-white font-bold"
                        >
                            Sign Up
                        </button>
                    </form>
                    <div className="mt-4 text-start">
                        Already have an account?{' '}
                        <button
                            onClick={() => navigate("/Login")}
                            className="text-purple-600 hover:underline font-semibold"
                        >
                            Sign in
                        </button>
                    </div>
                    <div className="flex justify-center gap-8 md:w-3/4 mt-5 ">
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
        </div>
    );
}

export default SignUp;
