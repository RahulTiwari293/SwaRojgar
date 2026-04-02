// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IArbitrable
 * @dev ERC-792: The interface that our GigEscrow must implement.
 *      Kleros Court will call `rule()` on our contract to deliver the verdict.
 */
interface IArbitrable {
    /**
     * @dev Emitted when a ruling is given by the arbitrator.
     * @param _arbitrator The arbitrator that gave the ruling.
     * @param _disputeID The ID of the dispute.
     * @param _ruling The ruling: 0=Refuse, 1=Pay Freelancer, 2=Refund Client.
     */
    event Ruling(address indexed _arbitrator, uint256 indexed _disputeID, uint256 _ruling);

    /**
     * @dev Called by the Kleros arbitrator to deliver a final ruling.
     *      MUST revert if msg.sender is not the registered arbitrator.
     * @param _disputeID The ID of the dispute.
     * @param _ruling The ruling given: 0=Refuse, 1=Pay Freelancer, 2=Refund Client.
     */
    function rule(uint256 _disputeID, uint256 _ruling) external;
}
