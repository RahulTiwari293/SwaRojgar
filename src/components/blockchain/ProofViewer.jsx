import React, { useState, useEffect } from 'react';
import { getProof } from '../../blockchain/blockchainAPI';
import { approveWorkOnChain, rejectWorkOnChain } from '../../blockchain/contractInteractions';
import './ProofViewer.css';

const ProofViewer = ({ gigId, onApprove, onReject }) => {
    const [proofData, setProofData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [showRejectForm, setShowRejectForm] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchProof();
    }, [gigId]);

    const fetchProof = async () => {
        try {
            setIsLoading(true);
            const data = await getProof(gigId);
            setProofData(data);
        } catch (err) {
            setError(err.message || 'Failed to load proof');
        } finally {
            setIsLoading(false);
        }
    };

    const handleApprove = async () => {
        if (!window.confirm('Are you sure you want to approve this work? Payment will be released immediately.')) {
            return;
        }

        setIsProcessing(true);
        setError(null);

        try {
            const txHash = await approveWorkOnChain(gigId);
            console.log('Work approved:', txHash);
            onApprove && onApprove(txHash);
        } catch (err) {
            setError(err.message || 'Failed to approve work');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleReject = async () => {
        if (!rejectReason.trim()) {
            setError('Please provide a reason for rejection');
            return;
        }

        if (!window.confirm('Are you sure you want to reject this work? This will raise a dispute.')) {
            return;
        }

        setIsProcessing(true);
        setError(null);

        try {
            const txHash = await rejectWorkOnChain(gigId, rejectReason);
            console.log('Work rejected:', txHash);
            onReject && onReject(txHash, rejectReason);
        } catch (err) {
            setError(err.message || 'Failed to reject work');
        } finally {
            setIsProcessing(false);
        }
    };

    if (isLoading) {
        return (
            <div className="proof-viewer loading">
                <div className="loader"></div>
                <p>Loading proof...</p>
            </div>
        );
    }

    if (error && !proofData) {
        return (
            <div className="proof-viewer error">
                <p>⚠️ {error}</p>
            </div>
        );
    }

    return (
        <div className="proof-viewer">
            <h3 className="viewer-title">📋 Review Proof of Work</h3>

            {/* Proof Metadata */}
            <div className="proof-metadata">
                <div className="metadata-item">
                    <span className="label">Files:</span>
                    <span className="value">{proofData.metadata?.fileCount || 'N/A'}</span>
                </div>
                <div className="metadata-item">
                    <span className="label">Uploaded:</span>
                    <span className="value">
                        {proofData.metadata?.uploadedAt
                            ? new Date(proofData.metadata.uploadedAt).toLocaleString()
                            : 'N/A'}
                    </span>
                </div>
                <div className="metadata-item">
                    <span className="label">IPFS Hash:</span>
                    <span className="value ipfs-hash" title={proofData.ipfsHash}>
                        {proofData.ipfsHash?.substring(0, 10)}...{proofData.ipfsHash?.substring(proofData.ipfsHash.length - 8)}
                    </span>
                </div>
            </div>

            {/* Description */}
            {proofData.metadata?.description && (
                <div className="proof-description">
                    <h4>Description:</h4>
                    <p>{proofData.metadata.description}</p>
                </div>
            )}

            {/* View Files Button */}
            <div className="view-files">
                <a
                    href={proofData.ipfsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="view-button"
                >
                    🔗 View Files on IPFS
                </a>
                <small>Files are stored on decentralized IPFS network</small>
            </div>

            {/* Action Buttons */}
            <div className="action-buttons">
                {!showRejectForm ? (
                    <>
                        <button
                            className="approve-button"
                            onClick={handleApprove}
                            disabled={isProcessing}
                        >
                            {isProcessing ? '⏳ Processing...' : '✅ Approve & Release Payment'}
                        </button>
                        <button
                            className="reject-button"
                            onClick={() => setShowRejectForm(true)}
                            disabled={isProcessing}
                        >
                            ❌ Reject Work
                        </button>
                    </>
                ) : (
                    <div className="reject-form">
                        <h4>Reason for Rejection:</h4>
                        <textarea
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="Please explain why you're rejecting this work..."
                            rows="4"
                            disabled={isProcessing}
                        />
                        <div className="reject-actions">
                            <button
                                className="confirm-reject-button"
                                onClick={handleReject}
                                disabled={isProcessing}
                            >
                                {isProcessing ? '⏳ Processing...' : 'Confirm Rejection'}
                            </button>
                            <button
                                className="cancel-button"
                                onClick={() => {
                                    setShowRejectForm(false);
                                    setRejectReason('');
                                }}
                                disabled={isProcessing}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Error Display */}
            {error && (
                <div className="error-message">
                    ⚠️ {error}
                </div>
            )}

            {/* Warning */}
            <div className="warning-box">
                <strong>⚠️ Important:</strong>
                <ul>
                    <li>Approving will immediately release payment to the freelancer</li>
                    <li>Rejecting will raise a dispute that requires admin resolution</li>
                    <li>Please review the work carefully before making a decision</li>
                </ul>
            </div>
        </div>
    );
};

export default ProofViewer;
