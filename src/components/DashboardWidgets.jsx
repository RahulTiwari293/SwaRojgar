import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './DashboardWidgets.css';

function DashboardWidgets() {
    const [userType, setUserType] = useState(null);
    const [userId, setUserId] = useState(null);
    const [stats, setStats] = useState({
        totalJobs: 0,
        activeJobs: 0,
        completedJobs: 0,
        totalAmount: 0,
        pendingReviews: 0
    });
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const type = localStorage.getItem('userType');
        const id = localStorage.getItem('userId');
        setUserType(type);
        setUserId(id);

        if (id && type) {
            fetchStats(id, type);
        } else {
            setLoading(false);
        }
    }, []);

    const fetchStats = async (id, type) => {
        try {
            const endpoint = type === 'client'
                ? `http://localhost:5010/api/jobs/customer/${id}`
                : `http://localhost:5010/api/jobs/freelancer/${id}`;

            const response = await axios.get(endpoint);
            const jobs = response.data;

            const activeJobs = jobs.filter(j => j.status === 'ACCEPTED' || j.status === 'IN_PROGRESS' || j.status === 'ASSIGNED').length;
            const completedJobs = jobs.filter(j => j.status === 'COMPLETED').length;
            const totalAmount = jobs.reduce((sum, j) => sum + (parseFloat(j.srtAmount) || 0), 0);
            const pendingReviews = jobs.filter(j => j.status === 'PROOF_SUBMITTED').length;

            setStats({
                totalJobs: jobs.length,
                activeJobs,
                completedJobs,
                totalAmount,
                pendingReviews
            });
        } catch (error) {
            console.error('Error fetching stats:', error);
        } finally {
            setLoading(false);
        }
    };

    // Quick action cards for customers
    const customerActions = [
        {
            title: 'Post a Job',
            description: 'Find the perfect freelancer for your project',
            icon: '📝',
            color: 'purple',
            action: () => navigate('/')
        },
        {
            title: 'Manage Jobs',
            description: `${stats.activeJobs} active projects`,
            icon: '💼',
            color: 'blue',
            action: () => navigate('/customer-jobs')
        },
        {
            title: 'Review Work',
            description: `${stats.pendingReviews} submissions to review`,
            icon: '✅',
            color: 'green',
            action: () => navigate('/customer-jobs'),
            badge: stats.pendingReviews
        }
    ];

    // Quick action cards for freelancers
    const freelancerActions = [
        {
            title: 'Find Work',
            description: 'Browse available job opportunities',
            icon: '🔍',
            color: 'purple',
            action: () => navigate('/')
        },
        {
            title: 'Active Projects',
            description: `${stats.activeJobs} jobs in progress`,
            icon: '💼',
            color: 'blue',
            action: () => navigate('/freelancer-jobs')
        },
        {
            title: 'Submit Work',
            description: 'Upload your completed work',
            icon: '📤',
            color: 'green',
            action: () => navigate('/work-submission')
        }
    ];

    const actions = userType === 'client' ? customerActions : freelancerActions;

    return (
        <div className="dashboard-widgets">
            {/* Welcome Banner */}
            <div className="welcome-banner">
                <div className="welcome-content">
                    <h2 className="welcome-title">
                        {userType === 'client' ? '👋 Welcome back, Client!' : '👋 Welcome back, Freelancer!'}
                    </h2>
                    <p className="welcome-subtitle">
                        {userType === 'client'
                            ? 'Find talented freelancers for your next project'
                            : 'Discover exciting job opportunities and grow your career'}
                    </p>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon purple">📊</div>
                    <div className="stat-content">
                        <span className="stat-value">{stats.totalJobs}</span>
                        <span className="stat-label">{userType === 'client' ? 'Jobs Posted' : 'Jobs Taken'}</span>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon blue">⚡</div>
                    <div className="stat-content">
                        <span className="stat-value">{stats.activeJobs}</span>
                        <span className="stat-label">Active Projects</span>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon green">✅</div>
                    <div className="stat-content">
                        <span className="stat-value">{stats.completedJobs}</span>
                        <span className="stat-label">Completed</span>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon orange">💰</div>
                    <div className="stat-content">
                        <span className="stat-value">{stats.totalAmount.toFixed(0)} SRT</span>
                        <span className="stat-label">{userType === 'client' ? 'Total Spent' : 'Total Earned'}</span>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="quick-actions-section">
                <h3 className="section-title">⚡ Quick Actions</h3>
                <div className="quick-actions-grid">
                    {actions.map((action, index) => (
                        <div
                            key={index}
                            className={`action-card ${action.color}`}
                            onClick={action.action}
                        >
                            <div className="action-icon">{action.icon}</div>
                            <div className="action-content">
                                <h4 className="action-title">{action.title}</h4>
                                <p className="action-description">{action.description}</p>
                            </div>
                            {action.badge > 0 && (
                                <div className="action-badge">{action.badge}</div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default DashboardWidgets;
