// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IEvidence
 * @dev ERC-1497: Evidence Standard.
 *      All evidence data lives on IPFS; only the URI/hash is emitted on-chain.
 *      The Kleros dispute resolver UI listens for these events.
 */
interface IEvidence {
    /**
     * @dev Emitted when a MetaEvidence document is linked to a dispute context.
     *      Must be emitted at gig creation time, before any dispute.
     * @param _metaEvidenceID A unique identifier for this MetaEvidence document.
     * @param _evidence IPFS URI (e.g. "/ipfs/Qm...") containing the MetaEvidence JSON.
     */
    event MetaEvidence(uint256 indexed _metaEvidenceID, string _evidence);

    /**
     * @dev Emitted when a dispute is created with an arbitrator.
     * @param _arbitrator The arbitrator contract address.
     * @param _disputeID The ID of the dispute at the arbitrator.
     * @param _metaEvidenceID Links this dispute to the MetaEvidence from gig creation.
     * @param _evidenceGroupID Groups all evidence for this specific dispute.
     */
    event Dispute(
        address indexed _arbitrator,
        uint256 indexed _disputeID,
        uint256 _metaEvidenceID,
        uint256 _evidenceGroupID
    );

    /**
     * @dev Emitted when a party submits evidence for a dispute.
     * @param _arbitrator The arbitrator contract address.
     * @param _evidenceGroupID The group this evidence belongs to.
     * @param _party The address of the party submitting evidence.
     * @param _evidence IPFS URI pointing to the Evidence JSON file.
     */
    event Evidence(
        address indexed _arbitrator,
        uint256 indexed _evidenceGroupID,
        address indexed _party,
        string _evidence
    );
}
