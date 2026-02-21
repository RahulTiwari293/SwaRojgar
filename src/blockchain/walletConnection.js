import { ethers } from 'ethers';

/**
 * Wallet connection utilities for MetaMask integration
 */

// Check if MetaMask is installed
export const isMetaMaskInstalled = () => {
    return typeof window !== 'undefined' && typeof window.ethereum !== 'undefined';
};

// Connect to MetaMask wallet
export const connectWallet = async () => {
    try {
        if (!isMetaMaskInstalled()) {
            throw new Error('MetaMask is not installed. Please install MetaMask to continue.');
        }

        // Request account access
        const accounts = await window.ethereum.request({
            method: 'eth_requestAccounts'
        });

        if (accounts.length === 0) {
            throw new Error('No accounts found. Please unlock MetaMask.');
        }

        const address = accounts[0];
        console.log('✅ Wallet connected:', address);

        return {
            address,
            provider: new ethers.BrowserProvider(window.ethereum)
        };
    } catch (error) {
        console.error('Error connecting wallet:', error);
        throw error;
    }
};

// Get current connected wallet address
export const getWalletAddress = async () => {
    try {
        if (!isMetaMaskInstalled()) {
            return null;
        }

        const accounts = await window.ethereum.request({
            method: 'eth_accounts'
        });

        return accounts.length > 0 ? accounts[0] : null;
    } catch (error) {
        console.error('Error getting wallet address:', error);
        return null;
    }
};

// Check if wallet is connected
export const isWalletConnected = async () => {
    const address = await getWalletAddress();
    return address !== null;
};

// Disconnect wallet (just clear local state, MetaMask stays connected)
export const disconnectWallet = () => {
    console.log('Wallet disconnected from app');
    // Note: MetaMask doesn't have a programmatic disconnect
    // This just clears the app's state
};

// Switch to a specific network
export const switchNetwork = async (chainId) => {
    try {
        await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: `0x${chainId.toString(16)}` }]
        });
        console.log(`✅ Switched to chain ID: ${chainId}`);
        return true;
    } catch (error) {
        // Chain not added to MetaMask
        if (error.code === 4902) {
            console.error('Network not added to MetaMask');
            throw new Error('Please add this network to MetaMask first');
        }
        console.error('Error switching network:', error);
        throw error;
    }
};

// Get current network chain ID
export const getCurrentChainId = async () => {
    try {
        const chainId = await window.ethereum.request({
            method: 'eth_chainId'
        });
        return parseInt(chainId, 16);
    } catch (error) {
        console.error('Error getting chain ID:', error);
        return null;
    }
};

// Listen for account changes
export const onAccountsChanged = (callback) => {
    if (isMetaMaskInstalled()) {
        window.ethereum.on('accountsChanged', callback);
    }
};

// Listen for network changes
export const onChainChanged = (callback) => {
    if (isMetaMaskInstalled()) {
        window.ethereum.on('chainChanged', callback);
    }
};

// Remove event listeners
export const removeAllListeners = () => {
    if (isMetaMaskInstalled()) {
        window.ethereum.removeAllListeners();
    }
};

// Format address for display (0x1234...5678)
export const formatAddress = (address) => {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
};

// Validate Ethereum address
export const isValidAddress = (address) => {
    return ethers.isAddress(address);
};
