// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.20;

/**
 * @title Roles
 *
 * @notice Defines keccak256 hashed identifiers for role-based access control used across the
 *         protocol. These identifiers are consumed by the {RoleSystem} mix-in and contracts that
 *         inherit from it.
 */
library Roles {
    /// @dev Role that owns protocol fees and treasury funds.
    bytes32 internal constant FINANCIAL_ROLE = keccak256("FINANCIAL_ROLE");

    /// @dev Whitelist role for regulated ArtToken transfers.
    bytes32 internal constant PARTNER_ROLE = keccak256("PARTNER_ROLE");

    /// @dev Role allowed to sign off-chain permits and other authorizations.
    bytes32 internal constant SIGNER_ROLE = keccak256("SIGNER_ROLE");

    /// @dev Role allowed to perform admin actions.
    bytes32 internal constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
}
