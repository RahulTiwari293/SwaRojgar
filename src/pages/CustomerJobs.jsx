import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../navbar';
import Breadcrumbs from '../components/Breadcrumbs';
import ProofViewer from '../components/blockchain/ProofViewer';
import { approveWorkOnChain } from '../blockchain/contractInteractions';
import './CustomerJobs.css';

function CustomerJobs() {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('all'); // all, open, assigned, review, completed
    const [selectedJob, setSelectedJob] = useState(null);
    const [proofData, setProofData] = useState(null);
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        fetchJobs();
    }, []);

    const fetchJobs = async () => {
        setLoading(true);
        try {
            const userId = localStorage.getItem('userId');
            const response = await axios.get(
                `http://localhost:5010/api/blockchain/gigs/user/${userId}?role=customer`
            );
            setJobs(response.data.gigs || []);
        } catch (err) {
            console.error('Error fetching jobs:', err);
            setError('Failed to load your jobs');
        } finally {
            setLoading(false);
        }
    };

    const fetchProof = async (gigId) => {
        try {
            const response = await axios.get(
                `http://localhost:5010/api/blockchain/gig/${gigId}/proof`
            );
            setProofData(response.data);
        } catch (err) {
            console.error('Error fetching proof:', err);
            setProofData(null);
        }
    };

    const handleViewProof = (job) => {
        setSelectedJob(job);
        fetchProof(job.gigId);
    };

    const handleApprove = async () => {
        if (!selectedJob) return;

        setProcessing(true);
        setError('');
        setSuccess('');

        try {
            // Approve work on blockchain (releases payment)
            const txHash = await approveWorkOnChain(selectedJob.gigId);

            // Update database
            await axios.post(
                `http://localhost:5010/api/blockchain/gig/${selectedJob.gigId}/approve`,
                { txHash }
            );

            setSuccess('✅ Work approved! Payment released to freelancer.');

            // Refresh jobs
            setTimeout(() => {
                fetchJobs();
                setSelectedJob(null);
                setProofData(null);
                setSuccess('');
            }, 3000);

        } catch (err) {
            console.error('Error approving work:', err);
            setError(err.message || 'Failed to approve work');
        } finally {
            setProcessing(false);
        }
    };

    const filteredJobs = jobs.filter(job => {
        if (activeTab === 'all') return true;
        if (activeTab === 'open') return job.status === 'OPEN';
        if (activeTab === 'assigned') return job.status === 'ASSIGNED';
        if (activeTab === 'review') return job.status === 'PROOF_SUBMITTED';
        if (activeTab === 'completed') return job.status === 'COMPLETED';
        return true;
    });

    const getStatusBadge = (status) => {
        const badges = {
            'OPEN': { icon: '🟢', text: 'Open', class: 'status-open' },
            'ASSIGNED': { icon: '🔄', text: 'In Progress', class: 'status-assigned' },
            'PROOF_SUBMITTED': { icon: '📋', text: 'Review Needed', class: 'status-review' },
            'COMPLETED': { icon: '✅', text: 'Completed', class: 'status-completed' },
            'DISPUTED': { icon: '⚠️', text: 'Disputed', class: 'status-disputed' }
        };
        return badges[status] || badges['OPEN'];
    };

    if (loading) {
        return (
            <div className="customer-jobs-container">
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Loading your jobs...</p>
                </div>
            </div>
        );
    }

    const breadcrumbItems = [
        { label: 'Home', path: '/' },
        { label: 'My Jobs', path: '/customer-jobs' }
    ];

    return (
        <div className="customer-jobs-page">
            <Navbar />
            <Breadcrumbs items={breadcrumbItems} />
            <div className="page-header">
                <h1>💼 My Posted Jobs</h1>
                <p>Manage your job postings and review submitted work</p>
            </div>

            {/* Tabs */}
            <div className="tabs">
                <button
                    className={`tab ${activeTab === 'all' ? 'active' : ''}`}
                    onClick={() => setActiveTab('all')}
                >
                    All Jobs ({jobs.length})
                </button>
                <button
                    className={`tab ${activeTab === 'open' ? 'active' : ''}`}
                    onClick={() => setActiveTab('open')}
                >
                    🟢 Open ({jobs.filter(j => j.status === 'OPEN').length})
                </button>
                <button
                    className={`tab ${activeTab === 'assigned' ? 'active' : ''}`}
                    onClick={() => setActiveTab('assigned')}
                >
                    🔄 In Progress ({jobs.filter(j => j.status === 'ASSIGNED').length})
                </button>
                <button
                    className={`tab ${activeTab === 'review' ? 'active' : ''}`}
                    onClick={() => setActiveTab('review')}
                >
                    📋 Review ({jobs.filter(j => j.status === 'PROOF_SUBMITTED').length})
                </button>
                <button
                    className={`tab ${activeTab === 'completed' ? 'active' : ''}`}
                    onClick={() => setActiveTab('completed')}
                >
                    ✅ Completed ({jobs.filter(j => j.status === 'COMPLETED').length})
                </button>
            </div>

            {/* Jobs Grid */}
            {filteredJobs.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">📭</div>
                    <h3>No Jobs Found</h3>
                    <p>You haven't posted any jobs in this category yet.</p>
                    <button onClick={() => navigate('/')} className="btn-primary">
                        Post a Job
                    </button>
                </div>
            ) : (
                <div className="jobs-grid">
                    {filteredJobs.map(job => {
                        const badge = getStatusBadge(job.status);
                        return (
                            <div key={job._id} className="job-card">
                                <div className="job-header">
                                    <h3>{job.title}</h3>
                                    <span className={`status-badge ${badge.class}`}>
                                        {badge.icon} {badge.text}
                                    </span>
                                </div>

                                <p className="job-description">{job.description}</p>

                                <div className="job-meta">
                                    <div className="meta-item">
                                        <span className="label">💰 Payment:</span>
                                        <span className="value">{job.amount} SRT</span>
                                    </div>
                                    {job.deadline && (
                                        <div className="meta-item">
                                            <span className="label">📅 Deadline:</span>
                                            <span className="value">
                                                {new Date(job.deadline).toLocaleDateString()}
                                            </span>
                                        </div>
                                    )}
                                    {job.freelancerId && (
                                        <div className="meta-item">
                                            <span className="label">👤 Freelancer:</span>
                                            <span className="value">
                                                {job.freelancerId.firstName} {job.freelancerId.lastName}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <div className="job-actions">
                                    {job.status === 'PROOF_SUBMITTED' && (
                                        <button
                                            onClick={() => handleViewProof(job)}
                                            className="btn-review"
                                        >
                                            👁️ Review Work
                                        </button>
                                    )}
                                    {job.status === 'COMPLETED' && (
                                        <button
                                            onClick={() => handleViewProof(job)}
                                            className="btn-view"
                                        >
                                            📄 View Details
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Proof Review Modal */}
            {selectedJob && (
                <div className="modal-overlay" onClick={() => setSelectedJob(null)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <button className="close-btn" onClick={() => setSelectedJob(null)}>
                            ✕
                        </button>

                        <h2>📋 Review Submitted Work</h2>

                        <div className="job-details">
                            <h3>{selectedJob.title}</h3>
                            <p>{selectedJob.description}</p>
                            <div className="detail-row">
                                <span>💰 Payment: {selectedJob.amount} SRT</span>
                                <span>👤 Freelancer: {selectedJob.freelancerId?.firstName} {selectedJob.freelancerId?.lastName}</span>
                            </div>
                        </div>

                        {proofData ? (
                            <div className="proof-section">
                                <h4>Submitted Proof</h4>
                                <p className="proof-description">{proofData.metadata?.description}</p>

                                <div className="proof-files">
                                    <p><strong>IPFS Hash:</strong> {proofData.ipfsHash}</p>
                                    <a
                                        href={proofData.ipfsUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn-view-ipfs"
                                    >
                                        🔗 View Files on IPFS
                                    </a>
                                </div>

                                {selectedJob.status === 'PROOF_SUBMITTED' && (
                                    <div className="approval-actions">
                                        {error && <div className="alert alert-error">⚠️ {error}</div>}
                                        {success && <div className="alert alert-success">{success}</div>}

                                        <button
                                            onClick={handleApprove}
                                            disabled={processing}
                                            className="btn-approve"
                                        >
                                            {processing ? (
                                                <>
                                                    <span className="spinner-small"></span>
                                                    Processing...
                                                </>
                                            ) : (
                                                '✅ Approve & Release Payment'
                                            )}
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="loading-proof">
                                <div className="spinner-small"></div>
                                <p>Loading proof...</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default CustomerJobs;
