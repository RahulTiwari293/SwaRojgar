import React from 'react';
import './PaymentFlowDiagram.css';

const PaymentFlowDiagram = ({ amount, customerWallet, freelancerWallet }) => {
    const platformFee = (amount * 0.02).toFixed(2);
    const freelancerAmount = (amount * 0.98).toFixed(2);

    return (
        <div className="payment-flow-diagram">
            <h4>💰 Payment Breakdown</h4>

            <div className="flow-container">
                {/* Customer */}
                <div className="flow-node customer">
                    <div className="node-icon">👤</div>
                    <div className="node-label">Customer</div>
                    <div className="node-address">{customerWallet?.substring(0, 8)}...</div>
                </div>

                {/* Arrow to Escrow */}
                <div className="flow-arrow">
                    <div className="arrow-line"></div>
                    <div className="arrow-label">Deposited</div>
                    <div className="arrow-amount">{amount} SRT</div>
                </div>

                {/* Escrow */}
                <div className="flow-node escrow">
                    <div className="node-icon">🔒</div>
                    <div className="node-label">Smart Contract</div>
                    <div className="node-sublabel">Escrow</div>
                </div>

                {/* Arrows from Escrow */}
                <div className="flow-split">
                    {/* To Freelancer */}
                    <div className="split-path">
                        <div className="flow-arrow">
                            <div className="arrow-line success"></div>
                            <div className="arrow-label">On Approval</div>
                            <div className="arrow-amount success">{freelancerAmount} SRT</div>
                        </div>
                        <div className="flow-node freelancer">
                            <div className="node-icon">💼</div>
                            <div className="node-label">Freelancer</div>
                            <div className="node-address">{freelancerWallet?.substring(0, 8)}...</div>
                        </div>
                    </div>

                    {/* To Platform */}
                    <div className="split-path">
                        <div className="flow-arrow">
                            <div className="arrow-line fee"></div>
                            <div className="arrow-label">Platform Fee</div>
                            <div className="arrow-amount fee">{platformFee} SRT</div>
                        </div>
                        <div className="flow-node platform">
                            <div className="node-icon">🏢</div>
                            <div className="node-label">Platform</div>
                            <div className="node-sublabel">2% Fee</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flow-info">
                <p>✅ When you verify and approve the work, the smart contract automatically transfers:</p>
                <ul>
                    <li><strong>{freelancerAmount} SRT</strong> to the freelancer's wallet</li>
                    <li><strong>{platformFee} SRT</strong> as platform fee</li>
                </ul>
                <p className="security-note">🔐 All transfers are secured by blockchain smart contracts</p>
            </div>
        </div>
    );
};

export default PaymentFlowDiagram;
