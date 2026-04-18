import React, { useState, useEffect } from "react";
import axios from "axios";
import { IoClose } from "react-icons/io5";
import PaymentModal from "./components/blockchain/PaymentModal";

function CreatePostModal({ isOpen, onClose }) {
    const [formData, setFormData] = useState({
        title: "",
        content: "",
        srtAmount: "",
        image: null,
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [createdPostId, setCreatedPostId] = useState(null);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [isClient, setIsClient] = useState(false);

    // Determine if user is a client
    useEffect(() => {
        const userType = localStorage.getItem("userType");
        setIsClient(userType === 'client');
        console.log("User type detected:", userType, "isClient:", userType === 'client');
    }, []);

    // Debug: Log when createdPostId or showPaymentModal changes
    useEffect(() => {
        console.log("State changed:", { createdPostId, showPaymentModal, isClient });
        if (createdPostId && showPaymentModal && isClient) {
            console.log("All conditions met - PaymentModal should render");
        }
    }, [createdPostId, showPaymentModal, isClient]);

    const handleInputChange = (e) => {
        const { name, type } = e.target;

        if (type === 'file') {
            setFormData((prev) => ({
                ...prev,
                [name]: e.target.files[0],
            }));
        } else {
            const { value } = e.target;
            setFormData((prev) => ({
                ...prev,
                [name]: value,
            }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            // Get userId and userType from localStorage (set during login/signup)
            const userId = localStorage.getItem("userId");
            const userType = localStorage.getItem("userType");

            if (!userId) {
                setError("Please log in to create a post");
                setLoading(false);
                return;
            }

            if (!userType) {
                setError("User type not found. Please log in again.");
                setLoading(false);
                return;
            }

            // Determine postType based on userType
            const postType = userType === 'client' ? 'job' : 'experience';

            // Validate SRT amount for clients
            if (isClient) {
                const amount = parseFloat(formData.srtAmount);
                if (!formData.srtAmount || amount <= 0) {
                    setError("Please enter a valid SRT payment amount");
                    setLoading(false);
                    return;
                }
            }

            const formDataToSend = new FormData();
            formDataToSend.append("userId", userId);
            formDataToSend.append("title", formData.title);
            formDataToSend.append("content", formData.content);
            formDataToSend.append("userType", userType);
            formDataToSend.append("postType", postType);

            // Add SRT amount for clients
            if (isClient) {
                formDataToSend.append("srtAmount", formData.srtAmount);
                formDataToSend.append("status", "OPEN"); // Set initial status for jobs
            }

            if (formData.image) {
                formDataToSend.append("image", formData.image);
            }

            const response = await axios.post(
                "http://localhost:5010/api/posts",
                formDataToSend,
                {
                    headers: {
                        "Content-Type": "multipart/form-data",
                    },
                }
            );

            console.log("Post created successfully:", response.data);
            const postId = response.data.post?._id || response.data._id;
            console.log("Setting createdPostId to:", postId);
            setCreatedPostId(postId);

            // For clients, open PaymentModal for blockchain escrow
            if (isClient) {
                console.log("Opening payment modal for client");
                console.log("createdPostId:", postId);
                console.log("showPaymentModal will be set to true");
                setShowPaymentModal(true);
                setLoading(false);
            } else {
                // For freelancers, just close the modal
                resetAndClose();
            }

        } catch (error) {
            console.error("Error creating post:", error);
            setError(error.response?.data?.message || "Failed to create post");
            setLoading(false);
        }
    };

    const handlePaymentSuccess = (gigId) => {
        console.log("Payment successful for gig:", gigId);

        // Notify parent component
        if (onPostCreated) {
            onPostCreated();
        }

        resetAndClose();
    };

    const handlePaymentClose = () => {
        setShowPaymentModal(false);
        // Still notify parent even if payment was cancelled
        if (onPostCreated) {
            onPostCreated();
        }
        resetAndClose();
    };

    const resetAndClose = () => {
        // Reset form
        setFormData({
            title: "",
            content: "",
            image: null,
            srtAmount: "",
        });
        setCreatedPostId(null);
        setShowPaymentModal(false);
        setLoading(false);
        setError("");

        // Close modal
        onClose();
    };

    if (!isOpen) return null;


    // Get userType to customize UI
    const userType = localStorage.getItem("userType");
    const modalTitle = isClient ? "Post Job Opportunity" : "Share Professional Experience";
    const titlePlaceholder = isClient ? "Job Title (e.g., Senior Full-Stack Developer)" : "Project Title (e.g., E-Commerce Platform Development)";
    const contentPlaceholder = isClient
        ? "Provide detailed job description including:\n• Required skills and qualifications\n• Project scope and deliverables\n• Timeline and milestones\n• Preferred experience level"
        : "Describe your professional experience:\n• Project overview and objectives\n• Technologies and tools utilized\n• Your role and key contributions\n• Outcomes and achievements";


    return (
        <>
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-bold text-gray-900">{modalTitle}</h2>
                        <button
                            onClick={onClose}
                            className="text-gray-500 hover:text-gray-800 transition-all"
                        >
                            <IoClose className="text-3xl" />
                        </button>
                    </div>

                    {error && (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold mb-2 text-gray-700">
                                {isClient ? "Position/Role" : "Project Title"}
                            </label>
                            <input
                                type="text"
                                name="title"
                                value={formData.title}
                                onChange={handleInputChange}
                                required
                                className="w-full p-3 border border-gray-300 rounded-lg focus:border-gray-500 focus:ring-2 focus:ring-gray-200 focus:outline-none transition-all"
                                placeholder={titlePlaceholder}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold mb-2 text-gray-700">
                                {isClient ? "Job Description" : "Experience Details"}
                            </label>
                            <textarea
                                name="content"
                                value={formData.content}
                                onChange={handleInputChange}
                                required
                                rows="6"
                                className="w-full p-3 border border-gray-300 rounded-lg focus:border-gray-500 focus:ring-2 focus:ring-gray-200 focus:outline-none transition-all resize-none"
                                placeholder={contentPlaceholder}
                            />
                        </div>

                        {/* SRT Payment Amount - Only for Clients */}
                        {isClient && (
                            <div className="bg-gray-50 p-4 rounded-lg border-2 border-gray-200">
                                <label className="block text-sm font-semibold mb-2 text-gray-700 flex items-center gap-2">
                                    <span className="text-xl">💰</span>
                                    Payment Amount (SRT)
                                </label>
                                <input
                                    type="number"
                                    name="srtAmount"
                                    value={formData.srtAmount}
                                    onChange={handleInputChange}
                                    required
                                    min="1"
                                    step="0.01"
                                    className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-gray-500 focus:ring-2 focus:ring-gray-200 focus:outline-none transition-all font-semibold text-lg"
                                    placeholder="e.g., 100"
                                />
                                <p className="text-xs text-gray-600 mt-2">
                                    💡 This amount will be held in escrow and released when you approve the work
                                </p>
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-semibold mb-2 text-gray-700">
                                {isClient ? "Attach Supporting Documents (Optional)" : "Project Images/Portfolio (Optional)"}
                            </label>
                            <input
                                type="file"
                                name="image"
                                onChange={handleInputChange}
                                accept="image/*"
                                className="w-full p-3 border border-gray-300 rounded-lg focus:border-gray-500 focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 transition-all"
                            />
                            {formData.image && (
                                <p className="text-sm text-green-600 mt-2 flex items-center">
                                    <span className="mr-2">✓</span> {formData.image.name}
                                </p>
                            )}
                        </div>

                        <div className="flex gap-3 pt-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 bg-gray-200 text-gray-700 font-semibold py-3 px-6 rounded-lg hover:bg-gray-300 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-black text-white font-semibold py-3 px-6 rounded-xl hover:bg-gray-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <span className="animate-spin">⏳</span>
                                        {isClient ? "Creating Job..." : "Posting..."}
                                    </span>
                                ) : (
                                    isClient ? "📝 Post Job & Continue to Payment" : "✨ Share Experience"
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Payment Modal for Blockchain Escrow */}
            {(() => {
                console.log("Checking PaymentModal render conditions:");
                console.log("- showPaymentModal:", showPaymentModal);
                console.log("- isClient:", isClient);
                console.log("- createdPostId:", createdPostId);
                console.log("- Should render:", showPaymentModal && isClient && createdPostId);
                return null;
            })()}

            {showPaymentModal && isClient && createdPostId && (
                <PaymentModal
                    isOpen={showPaymentModal}
                    onClose={handlePaymentClose}
                    onSuccess={handlePaymentSuccess}
                    gigData={{
                        gigId: createdPostId,
                        title: formData.title,
                        description: formData.content,
                        amount: parseFloat(formData.srtAmount),
                        deadline: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60) // 30 days from now
                    }}
                />
            )}
        </>
    );
}

export default CreatePostModal;
