import React, { useState } from 'react';
import { approveTokens, createGigOnChain } from '../../blockchain/contractInteractions';
import { getWalletAddress } from '../../blockchain/walletConnection';
import { createGig } from '../../blockchain/blockchainAPI';
import './PaymentModal.css';

const PaymentModal = ({ gigData, onClose, onSuccess }) => {
    const [step, setStep] = useState(1); // 1: Approve, 2: Create Gig, 3: Success
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState(null);
    const [txHash, setTxHash] = useState(null);

    const platformFee = gigData.amount * 0.02; // 2% platform fee
    const totalAmount = gigData.amount;

    // Step 1: Approve tokens
    const handleApprove = async () => {
        setIsProcessing(true);
        setError(null);

        try {
            const approveTxHash = await approveTokens(totalAmount);
            setTxHash(approveTxHash);
            setStep(2);
        } catch (err) {
            setError(err.message || 'Failed to approve tokens');
            console.error('Approval error:', err);
        } finally {
            setIsProcessing(false);
        }
    };

    // Step 2: Create gig on blockchain
    const handleCreateGig = async () => {
        setIsProcessing(true);
        setError(null);

        try {
            // Create gig on blockchain
            const createTxHash = await createGigOnChain(
                gigData.gigId,
                totalAmount,
                gigData.deadline || 0
            );

            // Get customer info
            const customerId = localStorage.getItem('userId');
            const customerWallet = await getWalletAddress();

            // Save to database
            await createGig({
                gigId: gigData.gigId,
                title: gigData.title,
                description: gigData.description,
                customerId,
                customerWallet,
                amount: totalAmount,
                deadline: gigData.deadline,
                txHash: createTxHash
            });

            setTxHash(createTxHash);
            setStep(3);

            // Call success callback after a short delay
            setTimeout(() => {
                onSuccess && onSuccess(createTxHash);
            }, 2000);
        } catch (err) {
            setError(err.message || 'Failed to create gig');
            console.error('Create gig error:', err);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="payment-modal-overlay" onClick={onClose}>
            <div className="payment-modal" onClick={(e) => e.stopPropagation()}>
                <button className="close-button" onClick={onClose}>×</button>

                <h2 className="modal-title">💰 Escrow Payment</h2>

                {/* Payment Summary */}
                <div className="payment-summary">
                    <div className="summary-row">
                        <span>Gig Amount:</span>
                        <span className="amount">{gigData.amount} SRT</span>
                    </div>
                    <div className="summary-row fee">
                        <span>Platform Fee (2%):</span>
                        <span className="amount">{platformFee.toFixed(2)} SRT</span>
                    </div>
                    <div className="summary-row total">
                        <span>Total Escrow:</span>
                        <span className="amount">{totalAmount} SRT</span>
                    </div>
                </div>

                {/* Progress Steps */}
                <div className="progress-steps">
                    <div className={`step ${step >= 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}>
                        <div className="step-number">1</div>
                        <div className="step-label">Approve Tokens</div>
                    </div>
                    <div className="step-connector"></div>
                    <div className={`step ${step >= 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`}>
                        <div className="step-number">2</div>
                        <div className="step-label">Create Escrow</div>
                    </div>
                    <div className="step-connector"></div>
                    <div className={`step ${step >= 3 ? 'active' : ''}`}>
                        <div className="step-number">3</div>
                        <div className="step-label">Complete</div>
                    </div>
                </div>

                {/* Step Content */}
                <div className="step-content">
                    {step === 1 && (
                        <div className="step-info">
                            <p>First, approve the escrow contract to hold your SRT tokens.</p>
                            <button
                                className="action-button"
                                onClick={handleApprove}
                                disabled={isProcessing}
                            >
                                {isProcessing ? '⏳ Approving...' : '✅ Approve Tokens'}
                            </button>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="step-info">
                            <p>Now, create the gig and deposit tokens into escrow.</p>
                            <button
                                className="action-button"
                                onClick={handleCreateGig}
                                disabled={isProcessing}
                            >
                                {isProcessing ? '⏳ Creating Gig...' : '🚀 Create Gig & Deposit'}
                            </button>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="step-info success">
                            <div className="success-icon">✅</div>
                            <h3>Gig Created Successfully!</h3>
                            <p>Your tokens are now in escrow. Freelancers can start applying!</p>
                            {txHash && (
                                <div className="tx-hash">
                                    <small>Transaction: {txHash.substring(0, 10)}...{txHash.substring(txHash.length - 8)}</small>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Error Display */}
                {error && (
                    <div className="error-message">
                        ⚠️ {error}
                    </div>
                )}

                {/* Info Box */}
                <div className="info-box">
                    <strong>ℹ️ How it works:</strong>
                    <ul>
                        <li>Your tokens are held securely in the smart contract</li>
                        <li>Payment is released only when you approve the work</li>
                        <li>If there's a dispute, admin can help resolve it</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default PaymentModal;
