import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../navbar';
import Breadcrumbs from '../components/Breadcrumbs';
import './FreelancerJobs.css';

function FreelancerJobs() {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('active'); // active, completed
    const [stats, setStats] = useState({
        totalEarned: 0,
        pending: 0,
        completed: 0,
        active: 0
    });
    const navigate = useNavigate();

    useEffect(() => {
        fetchJobs();
    }, []);

    const fetchJobs = async () => {
        setLoading(true);
        try {
            const userId = localStorage.getItem('userId');
            const response = await axios.get(
                `http://localhost:5010/api/blockchain/gigs/user/${userId}?role=freelancer`
            );

            const fetchedJobs = response.data.gigs || [];
            setJobs(fetchedJobs);

            // Calculate stats
            const completed = fetchedJobs.filter(j => j.status === 'COMPLETED');
            const active = fetchedJobs.filter(j => j.status === 'ASSIGNED' || j.status === 'PROOF_SUBMITTED');

            setStats({
                totalEarned: completed.reduce((sum, j) => sum + j.amount, 0),
                pending: active.reduce((sum, j) => sum + j.amount, 0),
                completed: completed.length,
                active: active.length
            });
        } catch (err) {
            console.error('Error fetching jobs:', err);
        } finally {
            setLoading(false);
        }
    };

    const filteredJobs = jobs.filter(job => {
        if (activeTab === 'active') {
            return job.status === 'ASSIGNED' || job.status === 'PROOF_SUBMITTED';
        }
        return job.status === 'COMPLETED';
    });

    const getStatusBadge = (status) => {
        const badges = {
            'ASSIGNED': { icon: '🔄', text: 'In Progress', class: 'status-progress' },
            'PROOF_SUBMITTED': { icon: '⏳', text: 'Under Review', class: 'status-review' },
            'COMPLETED': { icon: '✅', text: 'Completed', class: 'status-completed' }
        };
        return badges[status] || badges['ASSIGNED'];
    };

    if (loading) {
        return (
            <div className="freelancer-jobs-container">
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Loading your jobs...</p>
                </div>
            </div>
        );
    }

    const breadcrumbItems = [
        { label: 'Home', path: '/' },
        { label: 'My Jobs', path: '/freelancer-jobs' }
    ];

    return (
        <div className="freelancer-jobs-page">
            <Navbar />
            <Breadcrumbs items={breadcrumbItems} />
            <div className="page-header">
                <h1>💼 My Jobs</h1>
                <p>Track your active projects and earnings</p>
            </div>

            {/* Stats Cards */}
            <div className="stats-grid">
                <div className="stat-card earnings">
                    <div className="stat-icon">💰</div>
                    <div className="stat-content">
                        <h3>{stats.totalEarned.toFixed(2)} SRT</h3>
                        <p>Total Earned</p>
                    </div>
                </div>

                <div className="stat-card pending">
                    <div className="stat-icon">⏳</div>
                    <div className="stat-content">
                        <h3>{stats.pending.toFixed(2)} SRT</h3>
                        <p>Pending Payment</p>
                    </div>
                </div>

                <div className="stat-card active">
                    <div className="stat-icon">🔄</div>
                    <div className="stat-content">
                        <h3>{stats.active}</h3>
                        <p>Active Jobs</p>
                    </div>
                </div>

                <div className="stat-card completed">
                    <div className="stat-icon">✅</div>
                    <div className="stat-content">
                        <h3>{stats.completed}</h3>
                        <p>Completed Jobs</p>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="tabs">
                <button
                    className={`tab ${activeTab === 'active' ? 'active' : ''}`}
                    onClick={() => setActiveTab('active')}
                >
                    🔄 Active Jobs ({stats.active})
                </button>
                <button
                    className={`tab ${activeTab === 'completed' ? 'active' : ''}`}
                    onClick={() => setActiveTab('completed')}
                >
                    ✅ Completed ({stats.completed})
                </button>
            </div>

            {/* Jobs List */}
            {filteredJobs.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">📭</div>
                    <h3>No Jobs Found</h3>
                    <p>
                        {activeTab === 'active'
                            ? "You don't have any active jobs. Start applying for jobs to earn SRT!"
                            : "You haven't completed any jobs yet. Keep working!"}
                    </p>
                    {activeTab === 'active' && (
                        <button onClick={() => navigate('/')} className="btn-primary">
                            Find Jobs
                        </button>
                    )}
                </div>
            ) : (
                <div className="jobs-list">
                    {filteredJobs.map(job => {
                        const badge = getStatusBadge(job.status);
                        return (
                            <div key={job._id} className="job-item">
                                <div className="job-main">
                                    <div className="job-info">
                                        <h3>{job.title}</h3>
                                        <p className="job-description">{job.description}</p>

                                        <div className="job-meta">
                                            <span className="meta-tag">
                                                💰 {job.amount} SRT
                                            </span>
                                            {job.deadline && (
                                                <span className="meta-tag">
                                                    📅 {new Date(job.deadline).toLocaleDateString()}
                                                </span>
                                            )}
                                            <span className="meta-tag">
                                                👤 {job.customerId?.firstName} {job.customerId?.lastName}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="job-status">
                                        <span className={`status-badge ${badge.class}`}>
                                            {badge.icon} {badge.text}
                                        </span>
                                    </div>
                                </div>

                                {activeTab === 'active' && job.status === 'ASSIGNED' && (
                                    <div className="job-actions">
                                        <button
                                            onClick={() => navigate('/work-submission')}
                                            className="btn-submit-work"
                                        >
                                            📤 Submit Work
                                        </button>
                                    </div>
                                )}

                                {job.status === 'PROOF_SUBMITTED' && (
                                    <div className="job-note">
                                        <span className="note-icon">ℹ️</span>
                                        <span>Your work is under review by the customer</span>
                                    </div>
                                )}

                                {job.status === 'COMPLETED' && (
                                    <div className="job-note success">
                                        <span className="note-icon">✅</span>
                                        <span>Payment of {job.amount} SRT received</span>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export default FreelancerJobs;
