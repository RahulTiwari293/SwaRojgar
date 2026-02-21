import React, { useState } from 'react';
import { getWalletAddress } from '../../blockchain/walletConnection';
import { acceptGigOnChain } from '../../blockchain/contractInteractions';
import axios from 'axios';
import { IoClose } from 'react-icons/io5';
import './ApplyJobModal.css';

function ApplyJobModal({ isOpen, onClose, job, onSuccess }) {
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState(null);
    const [step, setStep] = useState(1); // 1: Confirm, 2: Processing, 3: Success

    const handleApply = async () => {
        setIsProcessing(true);
        setError(null);
        setStep(2);

        try {
            // Get wallet address
            const walletAddress = await getWalletAddress();
            if (!walletAddress) {
                throw new Error('Please connect your wallet first');
            }

            // Get freelancer ID from localStorage
            const freelancerId = localStorage.getItem('userId');
            if (!freelancerId) {
                throw new Error('Please log in to apply for jobs');
            }

            // Accept gig on blockchain
            const txHash = await acceptGigOnChain(job._id);
            console.log('Gig accepted on blockchain:', txHash);

            // Update job in database
            await axios.post(`http://localhost:5010/api/blockchain/gig/${job._id}/accept`, {
                freelancerId,
                freelancerWallet: walletAddress,
                txHash
            });

            setStep(3);

            // Call success callback after a short delay
            setTimeout(() => {
                onSuccess && onSuccess();
            }, 2000);

        } catch (err) {
            console.error('Error applying for job:', err);
            setError(err.message || 'Failed to apply for job');
            setStep(1);
        } finally {
            setIsProcessing(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="apply-modal-overlay" onClick={onClose}>
            <div className="apply-modal" onClick={(e) => e.stopPropagation()}>
                <button className="close-button" onClick={onClose}>
                    <IoClose className="text-3xl" />
                </button>

                <h2 className="modal-title">🚀 Apply for Job</h2>

                {/* Job Details */}
                <div className="job-details">
                    <h3 className="job-title">{job.title}</h3>

                    <div className="job-info-grid">
                        <div className="info-item">
                            <span className="info-label">💰 Payment</span>
                            <span className="info-value">{job.srtAmount} SRT</span>
                        </div>

                        {job.deadline && (
                            <div className="info-item">
                                <span className="info-label">📅 Deadline</span>
                                <span className="info-value">
                                    {new Date(job.deadline * 1000).toLocaleDateString()}
                                </span>
                            </div>
                        )}

                        <div className="info-item">
                            <span className="info-label">👤 Posted by</span>
                            <span className="info-value">
                                {job.userId?.firstName && job.userId?.lastName
                                    ? `${job.userId.firstName} ${job.userId.lastName}`
                                    : 'Client'}
                            </span>
                        </div>
                    </div>

                    <div className="job-description">
                        <p className="description-label">Description:</p>
                        <p className="description-text">{job.content}</p>
                    </div>
                </div>

                {/* Step Content */}
                <div className="step-content">
                    {step === 1 && (
                        <div className="step-info">
                            <div className="info-box">
                                <strong>ℹ️ What happens next:</strong>
                                <ul>
                                    <li>You'll be assigned to this job on the blockchain</li>
                                    <li>The customer's {job.srtAmount} SRT is already in escrow</li>
                                    <li>Complete the work and submit proof</li>
                                    <li>Get paid automatically when approved!</li>
                                </ul>
                            </div>

                            <button
                                className="action-button"
                                onClick={handleApply}
                                disabled={isProcessing}
                            >
                                ✅ Confirm Application
                            </button>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="step-info processing">
                            <div className="loading-spinner"></div>
                            <p>Processing your application...</p>
                            <small>Please confirm the transaction in MetaMask</small>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="step-info success">
                            <div className="success-icon">✅</div>
                            <h3>Application Successful!</h3>
                            <p>You've been assigned to this job. Start working and submit your proof when ready!</p>
                        </div>
                    )}
                </div>

                {/* Error Display */}
                {error && (
                    <div className="error-message">
                        ⚠️ {error}
                    </div>
                )}
            </div>
        </div>
    );
}

export default ApplyJobModal;
