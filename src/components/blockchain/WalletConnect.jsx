import React, { useState, useEffect } from 'react';
import { connectWallet, disconnectWallet, getWalletAddress, formatAddress, isMetaMaskInstalled } from '../../blockchain/walletConnection';
import { getTokenBalance } from '../../blockchain/blockchainAPI';
import './WalletConnect.css';

const WalletConnect = () => {
    const [walletAddress, setWalletAddress] = useState(null);
    const [tokenBalance, setTokenBalance] = useState('0');
    const [isConnecting, setIsConnecting] = useState(false);
    const [error, setError] = useState(null);

    // Check if wallet is already connected on mount
    useEffect(() => {
        checkConnection();
    }, []);

    // Check if wallet is connected
    const checkConnection = async () => {
        const address = await getWalletAddress();
        if (address) {
            setWalletAddress(address);
            fetchBalance(address);
        }
    };

    // Fetch SRT token balance
    const fetchBalance = async (address) => {
        try {
            const result = await getTokenBalance(address);
            setTokenBalance(parseFloat(result.balance).toFixed(2));
        } catch (error) {
            console.error('Error fetching balance:', error);
        }
    };

    // Handle wallet connection
    const handleConnect = async () => {
        setIsConnecting(true);
        setError(null);

        try {
            if (!isMetaMaskInstalled()) {
                throw new Error('Please install MetaMask to use this feature');
            }

            const { address } = await connectWallet();
            setWalletAddress(address);
            fetchBalance(address);

            // Save to localStorage
            localStorage.setItem('walletAddress', address);
        } catch (err) {
            setError(err.message);
            console.error('Connection error:', err);
        } finally {
            setIsConnecting(false);
        }
    };

    // Handle wallet disconnection
    const handleDisconnect = () => {
        disconnectWallet();
        setWalletAddress(null);
        setTokenBalance('0');
        localStorage.removeItem('walletAddress');
    };

    // Refresh balance
    const handleRefreshBalance = () => {
        if (walletAddress) {
            fetchBalance(walletAddress);
        }
    };

    return (
        <div className="wallet-connect">
            {!walletAddress ? (
                <button
                    className="connect-button"
                    onClick={handleConnect}
                    disabled={isConnecting}
                >
                    {isConnecting ? 'Connecting...' : '🔗 Connect Wallet'}
                </button>
            ) : (
                <div className="wallet-info">
                    <div className="wallet-address">
                        <span className="address-label">Wallet:</span>
                        <span className="address-value" title={walletAddress}>
                            {formatAddress(walletAddress)}
                        </span>
                    </div>
                    <div className="wallet-balance">
                        <span className="balance-label">Balance:</span>
                        <span className="balance-value">
                            {tokenBalance} SRT
                        </span>
                        <button
                            className="refresh-button"
                            onClick={handleRefreshBalance}
                            title="Refresh balance"
                        >
                            🔄
                        </button>
                    </div>
                    <button
                        className="disconnect-button"
                        onClick={handleDisconnect}
                    >
                        Disconnect
                    </button>
                </div>
            )}

            {error && (
                <div className="wallet-error">
                    ⚠️ {error}
                </div>
            )}
        </div>
    );
};

export default WalletConnect;
