import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { submitProofOnChain } from '../blockchain/contractInteractions';
import './WorkSubmission.css';

function WorkSubmission() {
    const [assignedJobs, setAssignedJobs] = useState([]);
    const [selectedJob, setSelectedJob] = useState(null);
    const [files, setFiles] = useState([]);
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        fetchAssignedJobs();
    }, []);

    const fetchAssignedJobs = async () => {
        setLoading(true);
        try {
            const userId = localStorage.getItem('userId');
            const response = await axios.get(
                `http://localhost:5010/api/blockchain/gigs/user/${userId}?role=freelancer`
            );

            // Filter only ASSIGNED jobs (not yet submitted)
            const assigned = response.data.gigs.filter(gig => gig.status === 'ASSIGNED');
            setAssignedJobs(assigned);
        } catch (err) {
            console.error('Error fetching jobs:', err);
            setError('Failed to load your jobs');
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e) => {
        const selectedFiles = Array.from(e.target.files);
        setFiles(selectedFiles);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const droppedFiles = Array.from(e.dataTransfer.files);
        setFiles(droppedFiles);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!selectedJob) {
            setError('Please select a job');
            return;
        }

        if (files.length === 0) {
            setError('Please upload at least one proof file');
            return;
        }

        if (!description.trim()) {
            setError('Please provide a description of your work');
            return;
        }

        setUploading(true);
        setError('');
        setSuccess('');

        try {
            // Step 1: Upload files to IPFS via backend
            const formData = new FormData();
            files.forEach(file => {
                formData.append('proofFiles', file);
            });
            formData.append('description', description);

            const uploadResponse = await axios.post(
                `http://localhost:5010/api/blockchain/gig/${selectedJob.gigId}/submit-proof`,
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data'
                    }
                }
            );

            const ipfsHash = uploadResponse.data.ipfsHash;

            // Step 2: Submit proof hash to blockchain
            const txHash = await submitProofOnChain(selectedJob.gigId, ipfsHash);

            setSuccess(`✅ Proof submitted successfully! Transaction: ${txHash.slice(0, 10)}...`);

            // Reset form
            setSelectedJob(null);
            setFiles([]);
            setDescription('');

            // Refresh jobs list
            setTimeout(() => {
                fetchAssignedJobs();
                setSuccess('');
            }, 3000);

        } catch (err) {
            console.error('Error submitting proof:', err);
            setError(err.response?.data?.message || err.message || 'Failed to submit proof');
        } finally {
            setUploading(false);
        }
    };

    const removeFile = (index) => {
        setFiles(files.filter((_, i) => i !== index));
    };

    if (loading) {
        return (
            <div className="work-submission-container">
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Loading your jobs...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="work-submission-container">
            <div className="page-header">
                <h1>📤 Submit Your Work</h1>
                <p>Upload proof of completed work to get paid</p>
            </div>

            {assignedJobs.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">📋</div>
                    <h3>No Active Jobs</h3>
                    <p>You don't have any jobs to submit work for yet.</p>
                    <button onClick={() => navigate('/')} className="btn-primary">
                        Find Jobs
                    </button>
                </div>
            ) : (
                <div className="submission-layout">
                    {/* Job Selection Sidebar */}
                    <div className="jobs-sidebar">
                        <h3>Your Active Jobs</h3>
                        {assignedJobs.map(job => (
                            <div
                                key={job._id}
                                className={`job-card ${selectedJob?._id === job._id ? 'selected' : ''}`}
                                onClick={() => setSelectedJob(job)}
                            >
                                <h4>{job.title}</h4>
                                <div className="job-meta">
                                    <span className="payment">💰 {job.amount} SRT</span>
                                    {job.deadline && (
                                        <span className="deadline">
                                            📅 {new Date(job.deadline).toLocaleDateString()}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Submission Form */}
                    <div className="submission-form">
                        {!selectedJob ? (
                            <div className="select-job-prompt">
                                <p>👈 Select a job from the sidebar to submit your work</p>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit}>
                                <div className="selected-job-details">
                                    <h2>{selectedJob.title}</h2>
                                    <p className="job-description">{selectedJob.description}</p>
                                    <div className="job-info">
                                        <span className="info-badge">💰 {selectedJob.amount} SRT</span>
                                        <span className="info-badge status">🔄 In Progress</span>
                                    </div>
                                </div>

                                {/* File Upload Area */}
                                <div className="form-section">
                                    <label>Upload Proof Files</label>
                                    <div
                                        className="file-upload-area"
                                        onDragOver={handleDragOver}
                                        onDrop={handleDrop}
                                        onClick={() => document.getElementById('file-input').click()}
                                    >
                                        <input
                                            id="file-input"
                                            type="file"
                                            multiple
                                            onChange={handleFileChange}
                                            style={{ display: 'none' }}
                                            accept="image/*,video/*,.pdf,.doc,.docx,.zip"
                                        />
                                        <div className="upload-icon">📁</div>
                                        <p className="upload-text">
                                            Drag & drop files here or click to browse
                                        </p>
                                        <small>Images, videos, documents, or ZIP files</small>
                                    </div>

                                    {/* File List */}
                                    {files.length > 0 && (
                                        <div className="file-list">
                                            {files.map((file, index) => (
                                                <div key={index} className="file-item">
                                                    <span className="file-name">📄 {file.name}</span>
                                                    <span className="file-size">
                                                        {(file.size / 1024 / 1024).toFixed(2)} MB
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeFile(index)}
                                                        className="remove-file"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Description */}
                                <div className="form-section">
                                    <label>Work Description</label>
                                    <textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Describe what you've completed, any challenges faced, and additional notes for the customer..."
                                        rows={6}
                                        required
                                    />
                                </div>

                                {/* Error/Success Messages */}
                                {error && (
                                    <div className="alert alert-error">
                                        ⚠️ {error}
                                    </div>
                                )}

                                {success && (
                                    <div className="alert alert-success">
                                        {success}
                                    </div>
                                )}

                                {/* Submit Button */}
                                <button
                                    type="submit"
                                    className="btn-submit"
                                    disabled={uploading}
                                >
                                    {uploading ? (
                                        <React.Fragment>
                                            <span className="spinner-small"></span>
                                            Uploading to IPFS...
                                        </React.Fragment>
                                    ) : (
                                        '🚀 Submit Work for Review'
                                    )}
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default WorkSubmission;
