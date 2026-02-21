import React, { useState } from 'react';
import { submitProof } from '../../blockchain/blockchainAPI';
import { submitProofOnChain } from '../../blockchain/contractInteractions';
import './ProofUpload.css';

const ProofUpload = ({ gigId, onSuccess }) => {
    const [files, setFiles] = useState([]);
    const [description, setDescription] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [error, setError] = useState(null);

    // Handle file selection
    const handleFileChange = (e) => {
        const selectedFiles = Array.from(e.target.files);
        setFiles(selectedFiles);
        setError(null);
    };

    // Remove a file from the list
    const removeFile = (index) => {
        setFiles(files.filter((_, i) => i !== index));
    };

    // Handle proof submission
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (files.length === 0) {
            setError('Please select at least one file');
            return;
        }

        setIsUploading(true);
        setError(null);
        setUploadProgress(0);

        try {
            // Step 1: Upload files to IPFS (30%)
            setUploadProgress(30);
            const ipfsResult = await submitProof(gigId, files, description);
            const ipfsHash = ipfsResult.ipfsHash;

            // Step 2: Submit IPFS hash to blockchain (70%)
            setUploadProgress(70);
            const txHash = await submitProofOnChain(gigId, ipfsHash);

            // Step 3: Complete (100%)
            setUploadProgress(100);

            console.log('Proof submitted successfully:', { ipfsHash, txHash });

            // Call success callback
            setTimeout(() => {
                onSuccess && onSuccess({ ipfsHash, txHash, ipfsUrl: ipfsResult.ipfsUrl });
            }, 1000);

        } catch (err) {
            setError(err.message || 'Failed to submit proof');
            console.error('Proof submission error:', err);
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="proof-upload">
            <h3 className="upload-title">📤 Submit Proof of Work</h3>

            <form onSubmit={handleSubmit}>
                {/* File Upload Area */}
                <div className="upload-area">
                    <input
                        type="file"
                        id="file-input"
                        multiple
                        onChange={handleFileChange}
                        accept="image/*,video/*,.pdf,.doc,.docx,.zip"
                        disabled={isUploading}
                    />
                    <label htmlFor="file-input" className="upload-label">
                        <div className="upload-icon">📁</div>
                        <p>Click to select files or drag and drop</p>
                        <small>Images, videos, documents, or ZIP files</small>
                    </label>
                </div>

                {/* Selected Files List */}
                {files.length > 0 && (
                    <div className="files-list">
                        <h4>Selected Files ({files.length})</h4>
                        {files.map((file, index) => (
                            <div key={index} className="file-item">
                                <div className="file-info">
                                    <span className="file-icon">📄</span>
                                    <span className="file-name">{file.name}</span>
                                    <span className="file-size">
                                        ({(file.size / 1024).toFixed(1)} KB)
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    className="remove-file"
                                    onClick={() => removeFile(index)}
                                    disabled={isUploading}
                                >
                                    ×
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* Description */}
                <div className="description-field">
                    <label htmlFor="description">Description (Optional)</label>
                    <textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Describe your work, any notes for the customer..."
                        rows="4"
                        disabled={isUploading}
                    />
                </div>

                {/* Upload Progress */}
                {isUploading && (
                    <div className="upload-progress">
                        <div className="progress-bar">
                            <div
                                className="progress-fill"
                                style={{ width: `${uploadProgress}%` }}
                            ></div>
                        </div>
                        <p className="progress-text">
                            {uploadProgress < 50 ? 'Uploading to IPFS...' :
                                uploadProgress < 100 ? 'Submitting to blockchain...' :
                                    'Complete!'}
                        </p>
                    </div>
                )}

                {/* Error Message */}
                {error && (
                    <div className="error-message">
                        ⚠️ {error}
                    </div>
                )}

                {/* Submit Button */}
                <button
                    type="submit"
                    className="submit-button"
                    disabled={isUploading || files.length === 0}
                >
                    {isUploading ? '⏳ Uploading...' : '🚀 Submit Proof'}
                </button>
            </form>

            {/* Info */}
            <div className="info-note">
                <strong>ℹ️ Note:</strong> Your files will be stored on IPFS (decentralized storage).
                The customer will be able to review your work before releasing payment.
            </div>
        </div>
    );
};

export default ProofUpload;
