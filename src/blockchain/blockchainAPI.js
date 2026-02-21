import axios from 'axios';

const API_BASE_URL = 'http://localhost:5010/api/blockchain';

/**
 * Blockchain API client for frontend
 */

// Get token balance for an address
export const getTokenBalance = async (address) => {
    try {
        const response = await axios.get(`${API_BASE_URL}/balance/${address}`);
        return response.data;
    } catch (error) {
        console.error('Error getting token balance:', error);
        throw error;
    }
};

// Create gig in database after blockchain transaction
export const createGig = async (gigData) => {
    try {
        const response = await axios.post(`${API_BASE_URL}/gig/create`, gigData);
        return response.data;
    } catch (error) {
        console.error('Error creating gig:', error);
        console.error('Error response:', error.response?.data);
        throw error;
    }
};

// Accept gig
export const acceptGig = async (gigId, acceptData) => {
    try {
        const response = await axios.post(`${API_BASE_URL}/gig/${gigId}/accept`, acceptData);
        return response.data;
    } catch (error) {
        console.error('Error accepting gig:', error);
        throw error;
    }
};

// Submit proof of work (upload files to IPFS)
export const submitProof = async (gigId, files, description) => {
    try {
        const formData = new FormData();

        // Add files
        files.forEach(file => {
            formData.append('proofFiles', file);
        });

        // Add description
        if (description) {
            formData.append('description', description);
        }

        const response = await axios.post(
            `${API_BASE_URL}/gig/${gigId}/submit-proof`,
            formData,
            {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            }
        );
        return response.data;
    } catch (error) {
        console.error('Error submitting proof:', error);
        throw error;
    }
};

// Get proof from IPFS
export const getProof = async (gigId) => {
    try {
        const response = await axios.get(`${API_BASE_URL}/gig/${gigId}/proof`);
        return response.data;
    } catch (error) {
        console.error('Error getting proof:', error);
        throw error;
    }
};

// Approve work
export const approveWork = async (gigId, txHash) => {
    try {
        const response = await axios.post(`${API_BASE_URL}/gig/${gigId}/approve`, { txHash });
        return response.data;
    } catch (error) {
        console.error('Error approving work:', error);
        throw error;
    }
};

// Reject work
export const rejectWork = async (gigId, reason, txHash) => {
    try {
        const response = await axios.post(`${API_BASE_URL}/gig/${gigId}/reject`, { reason, txHash });
        return response.data;
    } catch (error) {
        console.error('Error rejecting work:', error);
        throw error;
    }
};

// Get gig status from blockchain and database
export const getGigStatus = async (gigId) => {
    try {
        const response = await axios.get(`${API_BASE_URL}/gig/${gigId}/status`);
        return response.data;
    } catch (error) {
        console.error('Error getting gig status:', error);
        throw error;
    }
};

// Get all gigs for a user
export const getUserGigs = async (userId, role) => {
    try {
        const response = await axios.get(`${API_BASE_URL}/gigs/user/${userId}`, {
            params: { role }
        });
        return response.data;
    } catch (error) {
        console.error('Error getting user gigs:', error);
        throw error;
    }
};
