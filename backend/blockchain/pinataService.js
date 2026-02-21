const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

class PinataService {
    constructor() {
        // Pinata now uses JWT authentication
        this.jwt = process.env.PINATA_JWT || process.env.PINATA_API_KEY; // Fallback to API_KEY for JWT
        this.baseUrl = 'https://api.pinata.cloud';
        this.gatewayUrl = 'https://gateway.pinata.cloud/ipfs';
    }

    /**
     * Test Pinata connection
     */
    async testConnection() {
        try {
            const response = await axios.get(`${this.baseUrl}/data/testAuthentication`, {
                headers: {
                    'Authorization': `Bearer ${this.jwt}`
                }
            });
            console.log('✅ Pinata connection successful:', response.data.message);
            return true;
        } catch (error) {
            console.error('❌ Pinata connection failed:', error.message);
            console.error('Response:', error.response?.data);
            return false;
        }
    }

    /**
     * Upload file to IPFS via Pinata
     * @param {Buffer|Stream} fileData - File data to upload
     * @param {string} fileName - Name of the file
     * @param {object} metadata - Optional metadata
     */
    async uploadFile(fileData, fileName, metadata = {}) {
        try {
            const formData = new FormData();
            formData.append('file', fileData, fileName);

            // Add metadata
            const pinataMetadata = JSON.stringify({
                name: fileName,
                keyvalues: {
                    ...metadata,
                    uploadedAt: new Date().toISOString()
                }
            });
            formData.append('pinataMetadata', pinataMetadata);

            // Upload to Pinata
            const response = await axios.post(
                `${this.baseUrl}/pinning/pinFileToIPFS`,
                formData,
                {
                    headers: {
                        ...formData.getHeaders(),
                        'Authorization': `Bearer ${this.jwt}`
                    },
                    maxBodyLength: Infinity
                }
            );

            console.log('📤 File uploaded to IPFS:', response.data.IpfsHash);

            return {
                ipfsHash: response.data.IpfsHash,
                pinSize: response.data.PinSize,
                timestamp: response.data.Timestamp,
                url: `${this.gatewayUrl}/${response.data.IpfsHash}`
            };
        } catch (error) {
            console.error('Error uploading to Pinata:', error.message);
            throw new Error(`Failed to upload file to IPFS: ${error.message}`);
        }
    }

    /**
     * Upload multiple files as a directory
     * @param {Array} files - Array of {data, name} objects
     * @param {object} metadata - Optional metadata
     */
    async uploadMultipleFiles(files, metadata = {}) {
        try {
            const formData = new FormData();

            // Add all files
            files.forEach(file => {
                formData.append('file', file.data, {
                    filepath: file.name
                });
            });

            // Add metadata
            const pinataMetadata = JSON.stringify({
                name: metadata.gigId || 'proof-of-work',
                keyvalues: {
                    ...metadata,
                    uploadedAt: new Date().toISOString(),
                    fileCount: files.length
                }
            });
            formData.append('pinataMetadata', pinataMetadata);

            // Upload to Pinata
            const response = await axios.post(
                `${this.baseUrl}/pinning/pinFileToIPFS`,
                formData,
                {
                    headers: {
                        ...formData.getHeaders(),
                        'Authorization': `Bearer ${this.jwt}`
                    },
                    maxBodyLength: Infinity
                }
            );

            console.log('📤 Files uploaded to IPFS:', response.data.IpfsHash);

            return {
                ipfsHash: response.data.IpfsHash,
                pinSize: response.data.PinSize,
                timestamp: response.data.Timestamp,
                url: `${this.gatewayUrl}/${response.data.IpfsHash}`,
                fileCount: files.length
            };
        } catch (error) {
            console.error('Error uploading multiple files to Pinata:', error.message);
            throw new Error(`Failed to upload files to IPFS: ${error.message}`);
        }
    }

    /**
     * Upload JSON data to IPFS
     * @param {object} jsonData - JSON data to upload
     * @param {object} metadata - Optional metadata
     */
    async uploadJSON(jsonData, metadata = {}) {
        try {
            const response = await axios.post(
                `${this.baseUrl}/pinning/pinJSONToIPFS`,
                {
                    pinataContent: jsonData,
                    pinataMetadata: {
                        name: metadata.name || 'json-data',
                        keyvalues: {
                            ...metadata,
                            uploadedAt: new Date().toISOString()
                        }
                    }
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.jwt}`
                    }
                }
            );

            console.log('📤 JSON uploaded to IPFS:', response.data.IpfsHash);

            return {
                ipfsHash: response.data.IpfsHash,
                pinSize: response.data.PinSize,
                timestamp: response.data.Timestamp,
                url: `${this.gatewayUrl}/${response.data.IpfsHash}`
            };
        } catch (error) {
            console.error('Error uploading JSON to Pinata:', error.message);
            throw new Error(`Failed to upload JSON to IPFS: ${error.message}`);
        }
    }

    /**
     * Retrieve file from IPFS
     * @param {string} ipfsHash - IPFS hash of the file
     */
    async getFile(ipfsHash) {
        try {
            const url = `${this.gatewayUrl}/${ipfsHash}`;
            const response = await axios.get(url, {
                responseType: 'arraybuffer'
            });

            console.log('📥 File retrieved from IPFS:', ipfsHash);

            return {
                data: response.data,
                contentType: response.headers['content-type']
            };
        } catch (error) {
            console.error('Error retrieving from IPFS:', error.message);
            throw new Error(`Failed to retrieve file from IPFS: ${error.message}`);
        }
    }

    /**
     * Get file URL
     * @param {string} ipfsHash - IPFS hash
     */
    getFileUrl(ipfsHash) {
        return `${this.gatewayUrl}/${ipfsHash}`;
    }

    /**
     * Unpin file from Pinata (cleanup)
     * @param {string} ipfsHash - IPFS hash to unpin
     */
    async unpinFile(ipfsHash) {
        try {
            await axios.delete(
                `${this.baseUrl}/pinning/unpin/${ipfsHash}`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.jwt}`
                    }
                }
            );

            console.log('🗑️  File unpinned from IPFS:', ipfsHash);
            return true;
        } catch (error) {
            console.error('Error unpinning file:', error.message);
            return false;
        }
    }

    /**
     * List pinned files
     */
    async listPinnedFiles(metadata = {}) {
        try {
            const response = await axios.get(
                `${this.baseUrl}/data/pinList`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.jwt}`
                    },
                    params: {
                        ...metadata,
                        status: 'pinned'
                    }
                }
            );

            return response.data.rows;
        } catch (error) {
            console.error('Error listing pinned files:', error.message);
            throw error;
        }
    }
}

// Export singleton instance
module.exports = new PinataService();
