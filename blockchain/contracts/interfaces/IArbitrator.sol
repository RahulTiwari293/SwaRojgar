// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./IArbitrable.sol";

/**
 * @title IArbitrator
 * @dev ERC-792: Arbitration Standard — Interface for the Kleros Court contract.
 *      Our GigEscrow calls `createDispute` on this contract to open a case.
 */
interface IArbitrator {
    enum DisputeStatus { Waiting, Appealable, Solved }

    /// @dev Emitted when a dispute is created.
    event DisputeCreation(uint256 indexed _disputeID, IArbitrable indexed _arbitrable);
    /// @dev Emitted when a dispute can be appealed.
    event AppealPossible(uint256 indexed _disputeID, IArbitrable indexed _arbitrable);
    /// @dev Emitted when appeal decision is made.
    event AppealDecision(uint256 indexed _disputeID, IArbitrable indexed _arbitrable);

    /**
     * @dev Create a dispute. Must be called by the arbitrable contract.
     * @param _choices The number of choices the arbitrator can choose from.
     * @param _extraData Encodes sub-court ID + number of jurors.
     * @return disputeID The ID of the dispute created.
     */
    function createDispute(uint256 _choices, bytes calldata _extraData)
        external payable returns (uint256 disputeID);

    /**
     * @dev Returns the arbitration cost in ETH required to create a dispute.
     * @param _extraData Encodes sub-court ID + number of jurors.
     */
    function arbitrationCost(bytes calldata _extraData)
        external view returns (uint256 cost);

    /**
     * @dev Appeal a ruling. Must be called before the appeal period ends.
     */
    function appeal(uint256 _disputeID, bytes calldata _extraData) external payable;

    /**
     * @dev Returns the cost of appealing a dispute.
     */
    function appealCost(uint256 _disputeID, bytes calldata _extraData)
        external view returns (uint256 cost);

    /**
     * @dev Returns the start and end timestamp of the appeal period.
     */
    function appealPeriod(uint256 _disputeID)
        external view returns (uint256 start, uint256 end);

    /**
     * @dev Returns the current status of a dispute.
     */
    function disputeStatus(uint256 _disputeID)
        external view returns (DisputeStatus status);

    /**
     * @dev Returns the current ruling of a dispute.
     */
    function currentRuling(uint256 _disputeID) external view returns (uint256 ruling);
}
