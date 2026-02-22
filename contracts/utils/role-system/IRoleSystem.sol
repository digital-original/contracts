// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.20;

/**
 * @title IRoleSystem
 * @notice Interface describing the on-chain role-based access-control system used by the
 *         protocol. Provides both multi-owner roles (grant/revoke) and unique roles
 *         (single owner, transferable).
 */
interface IRoleSystem {
    /**
     * @notice Emitted when `role` is granted to `account`.
     * @param role Identifier of the role granted.
     * @param account Recipient account that now possesses the role.
     */
    event RoleGranted(bytes32 indexed role, address indexed account);

    /**
     * @notice Emitted when `role` is revoked from `account`.
     * @param role Identifier of the role revoked.
     * @param account Account that lost the role.
     */
    event RoleRevoked(bytes32 indexed role, address indexed account);

    /**
     * @notice Emitted when ownership of a unique role is transferred.
     * @param role Identifier of the unique role.
     * @param oldOwner Address of the previous owner of the role.
     * @param newOwner Address that becomes the new owner of the role.
     */
    event UniqueRoleTransferred(bytes32 indexed role, address indexed oldOwner, address indexed newOwner);

    /**
     * @notice Grants `role` to `account`.
     * @param role The role to be granted.
     * @param account The account for granting the role.
     */
    function grantRole(bytes32 role, address account) external;

    /**
     * @notice Revokes `role` from `account`.
     * @param role The role to be revoked.
     * @param account The account for revoking the role.
     */
    function revokeRole(bytes32 role, address account) external;

    /**
     * @notice Transfers `uniqueRole` from the previous role owner to `newOwner`.
     * @dev Passing the zero address as `newOwner` will effectively revoke the role without
     *      assigning it to anyone.
     * @param uniqueRole The role to be transferred.
     * @param newOwner The new owner of the unique role (may be address(0)).
     */
    function transferUniqueRole(bytes32 uniqueRole, address newOwner) external;

    /**
     * @notice Checks if `account` has been granted `role`.
     * @param role The role to query.
     * @param account The account to query.
     * @return True if `account` possesses `role`.
     */
    function hasRole(bytes32 role, address account) external view returns (bool);

    /**
     * @notice Returns the owner of `uniqueRole`.
     * @param uniqueRole The unique role to query.
     * @return owner Address of the current role owner.
     */
    function uniqueRoleOwner(bytes32 uniqueRole) external view returns (address owner);

    /// @dev Thrown when a function restricted to the main role owner is called by another account.
    error RoleSystemNotMain();

    /**
     * @dev Thrown when an account does not have the required role.
     * @param account The account that does not have the required role.
     * @param requiredRole The required role.
     */
    error RoleSystemUnauthorizedAccount(address account, bytes32 requiredRole);

    /// @dev Thrown when the zero address is supplied where a non-zero address is required.
    error RoleSystemZeroAddress();

    /// @dev Thrown when attempting to grant a role to an account that already has it.
    error RoleSystemAlreadyHasRole(bytes32 role, address account);

    /// @dev Thrown when attempting to revoke a role from an account that does not have it.
    error RoleSystemMissingRole(bytes32 role, address account);

    /// @dev Thrown when a constructor argument at index `argIndex` is invalid.
    error RoleSystemMisconfiguration(uint8 argIndex);
}
