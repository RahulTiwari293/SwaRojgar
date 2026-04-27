import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { pushToast } from '../context/GigContext';
import './WalletButton.css';

const BACKEND = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:5010';

function WalletButton() {
    const [account, setAccount] = useState(null);
    const [balance, setBalance] = useState('0');
    const [showDropdown, setShowDropdown] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);

    useEffect(() => {
        checkWalletConnection();

        // Listen for account changes
        if (window.ethereum) {
            window.ethereum.on('accountsChanged', handleAccountsChanged);
            window.ethereum.on('chainChanged', () => window.location.reload());
        }

        return () => {
            if (window.ethereum) {
                window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
            }
        };
    }, []);

    useEffect(() => {
        if (account) {
            fetchBalance();
        }
    }, [account]);

    const checkWalletConnection = async () => {
        if (window.ethereum) {
            try {
                const accounts = await window.ethereum.request({ method: 'eth_accounts' });
                if (accounts.length > 0) {
                    setAccount(accounts[0]);
                }
            } catch (error) {
                console.error('Error checking wallet connection:', error);
            }
        }
    };

    const handleAccountsChanged = (accounts) => {
        if (accounts.length === 0) {
            setAccount(null);
            setBalance('0');
        } else {
            setAccount(accounts[0]);
        }
    };

    const fetchBalance = async () => {
        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();

            // Get SRT token contract address from environment
            const tokenAddress = (import.meta.env.VITE_TOKEN_CONTRACT_ADDRESS || "0x5D3976fc3F92174da8F851a12a5b0056CC6783A0").trim();
            const tokenABI = ['function balanceOf(address) view returns (uint256)'];
            const tokenContract = new ethers.Contract(
                tokenAddress,
                tokenABI,
                signer
            );

            const bal = await tokenContract.balanceOf(account);
            setBalance(ethers.formatEther(bal));
        } catch (error) {
            console.error('Error fetching balance:', error);
        }
    };

    const connectWallet = async () => {
        if (!window.ethereum) {
            alert('Please install MetaMask to use this feature!');
            return;
        }

        setIsConnecting(true);
        try {
            const accounts = await window.ethereum.request({
                method: 'eth_requestAccounts'
            });
            setAccount(accounts[0]);
        } catch (error) {
            console.error('Error connecting wallet:', error);
        } finally {
            setIsConnecting(false);
        }
    };

    const disconnectWallet = () => {
        setAccount(null);
        setBalance('0');
        setShowDropdown(false);
    };

    const shortenAddress = (address) => {
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    };

    const viewOnExplorer = () => {
        window.open(`https://sepolia.etherscan.io/address/${account}`, '_blank');
    };

    const getTestSRT = async () => {
        setShowDropdown(false);
        try {
            pushToast('⏳ Requesting 1000 test SRT...', 'loading', 10000);
            const res = await fetch(`${BACKEND}/api/faucet`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    walletAddress: account,
                    adminKey: 'swarojgar_admin_secret_change_in_prod',
                }),
            });
            const data = await res.json();
            if (res.ok) {
                pushToast(`✅ 1000 SRT sent! TX: ${data.txHash?.slice(0, 10)}...`, 'success', 6000);
                setTimeout(fetchBalance, 5000); // refresh balance after ~1 block
            } else {
                pushToast(data.message || 'Faucet failed', 'error');
            }
        } catch (e) {
            pushToast('Faucet request failed: ' + e.message, 'error');
        }
    };

    if (!account) {
        return (
            <button
                className="wallet-connect-btn"
                onClick={connectWallet}
                disabled={isConnecting}
            >
                {isConnecting ? (
                    <>
                        <span className="spinner-small"></span>
                        Connecting...
                    </>
                ) : (
                    <>
                        🔗 Connect Wallet
                    </>
                )}
            </button>
        );
    }

    return (
        <div className="wallet-button-container">
            <button
                className="wallet-connected-btn"
                onClick={() => setShowDropdown(!showDropdown)}
            >
                <div className="wallet-info">
                    <span className="wallet-balance">{parseFloat(balance).toFixed(2)} SRT</span>
                    <span className="wallet-address">{shortenAddress(account)}</span>
                </div>
                <span className={`dropdown-arrow ${showDropdown ? 'open' : ''}`}>▼</span>
            </button>

            {showDropdown && (
                <div className="wallet-dropdown">
                    <div className="dropdown-header">
                        <div className="dropdown-balance">
                            <span className="balance-label">Balance</span>
                            <span className="balance-amount">{parseFloat(balance).toFixed(4)} SRT</span>
                        </div>
                        <div className="dropdown-address">
                            {shortenAddress(account)}
                        </div>
                    </div>

                    <div className="dropdown-divider"></div>

                    <button
                        className="dropdown-item"
                        onClick={viewOnExplorer}
                    >
                        <span>🔍</span>
                        View on Explorer
                    </button>

                    <button
                        className="dropdown-item"
                        onClick={getTestSRT}
                    >
                        <span>🪙</span>
                        Get 1000 Test SRT
                    </button>

                    <button
                        className="dropdown-item disconnect"
                        onClick={disconnectWallet}
                    >
                        <span>🔌</span>
                        Disconnect
                    </button>
                </div>
            )}
        </div>
    );
}

export default WalletButton;
