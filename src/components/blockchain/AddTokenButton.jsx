import React, { useState } from 'react';
import './AddTokenButton.css';

const AddTokenButton = ({ tokenAddress, tokenSymbol = 'SRT', tokenDecimals = 18, tokenImage = null }) => {
    const [isAdding, setIsAdding] = useState(false);
    const [message, setMessage] = useState(null);

    const addTokenToMetaMask = async () => {
        if (!window.ethereum) {
            setMessage({ type: 'error', text: 'MetaMask not installed' });
            return;
        }

        if (!tokenAddress) {
            setMessage({ type: 'error', text: 'Token address not configured' });
            return;
        }

        setIsAdding(true);
        setMessage(null);

        try {
            const wasAdded = await window.ethereum.request({
                method: 'wallet_watchAsset',
                params: {
                    type: 'ERC20',
                    options: {
                        address: tokenAddress,
                        symbol: tokenSymbol,
                        decimals: tokenDecimals,
                        image: tokenImage
                    }
                }
            });

            if (wasAdded) {
                setMessage({ type: 'success', text: `${tokenSymbol} added to MetaMask!` });
            } else {
                setMessage({ type: 'info', text: 'Token import cancelled' });
            }
        } catch (error) {
            console.error('Error adding token:', error);
            setMessage({ type: 'error', text: 'Failed to add token' });
        } finally {
            setIsAdding(false);
        }
    };

    return (
        <div className="add-token-button-container">
            <button
                className="add-token-button"
                onClick={addTokenToMetaMask}
                disabled={isAdding}
            >
                {isAdding ? '⏳ Adding...' : `🦊 Add ${tokenSymbol} to MetaMask`}
            </button>

            {message && (
                <div className={`token-message ${message.type}`}>
                    {message.type === 'success' && '✅ '}
                    {message.type === 'error' && '⚠️ '}
                    {message.type === 'info' && 'ℹ️ '}
                    {message.text}
                </div>
            )}
        </div>
    );
};

export default AddTokenButton;
