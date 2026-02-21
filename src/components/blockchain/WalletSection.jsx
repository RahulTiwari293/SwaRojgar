import React, { useState, useEffect } from 'react';
import { getWalletAddress } from '../../blockchain/walletConnection';
import { getTokenBalance } from '../../blockchain/blockchainAPI';
import { FaWallet, FaCoins } from 'react-icons/fa';
import { MdContentCopy } from 'react-icons/md';
import './WalletSection.css';

function WalletSection({ onBalanceUpdate }) {
    const [walletAddress, setWalletAddress] = useState(null);
    const [balance, setBalance] = useState('0');
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        loadWalletData();
    }, []);

    const loadWalletData = async () => {
        try {
            const address = await getWalletAddress();
            if (address) {
                setWalletAddress(address);
                const balanceData = await getTokenBalance(address);
                const bal = balanceData.balance || '0';
                setBalance(bal);
                if (onBalanceUpdate) {
                    onBalanceUpdate(bal);
                }
            }
        } catch (error) {
            console.error('Error loading wallet data:', error);
        } finally {
            setLoading(false);
        }
    };

    const copyAddress = () => {
        if (walletAddress) {
            navigator.clipboard.writeText(walletAddress);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const formatAddress = (address) => {
        if (!address) return '';
        return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
    };

    const formatBalance = (bal) => {
        const num = parseFloat(bal);
        if (num >= 1000000) {
            return `${(num / 1000000).toFixed(2)}M`;
        } else if (num >= 1000) {
            return `${(num / 1000).toFixed(2)}K`;
        }
        return num.toFixed(2);
    };

    if (loading) {
        return (
            <div className="wallet-section loading">
                <div className="loading-spinner"></div>
                <p>Loading wallet...</p>
            </div>
        );
    }

    if (!walletAddress) {
        return (
            <div className="wallet-section not-connected">
                <FaWallet className="wallet-icon" />
                <p className="text-gray-600">Wallet not connected</p>
                <p className="text-sm text-gray-500">Connect your wallet to see balance</p>
            </div>
        );
    }

    return (
        <div className="wallet-section connected">
            <div className="wallet-header">
                <FaWallet className="wallet-icon" />
                <h3>Wallet Connected</h3>
            </div>

            <div className="wallet-address">
                <span className="address-label">Address:</span>
                <div className="address-display">
                    <span className="address-text">{formatAddress(walletAddress)}</span>
                    <button
                        onClick={copyAddress}
                        className="copy-button"
                        title="Copy full address"
                    >
                        <MdContentCopy />
                    </button>
                    {copied && <span className="copied-tooltip">Copied!</span>}
                </div>
            </div>

            <div className="wallet-balance">
                <FaCoins className="balance-icon" />
                <div className="balance-info">
                    <span className="balance-label">SRT Balance</span>
                    <span className="balance-amount">{formatBalance(balance)} SRT</span>
                </div>
            </div>

            <div className="wallet-actions">
                <button
                    onClick={loadWalletData}
                    className="refresh-button"
                >
                    🔄 Refresh Balance
                </button>
            </div>
        </div>
    );
}

export default WalletSection;
