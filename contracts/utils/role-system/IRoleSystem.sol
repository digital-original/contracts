// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.20;

/**
 * @title IRoleSystem
 *
 * @notice Interface describing the on-chain role-based access-control system
 *         used by the protocol. Provides both multi-owner roles (grant/revoke)
 *         and unique roles (single owner, transferable).
 */
interface IRoleSystem {
    /**
     * @notice Emitted when `role` is granted to `account`.
     *
     * @param role    Identifier of the role granted.
     * @param account Recipient account that now possesses the role.
     */
    event RoleGranted(bytes32 indexed role, address indexed account);

    /**
     * @notice Emitted when `role` is revoked from `account`.
     *
     * @param role    Identifier of the role revoked.
     * @param account Account that lost the role.
     */
    event RoleRevoked(bytes32 indexed role, address indexed account);

    /**
     * @notice Emitted when ownership of a unique role is transferred.
     *
     * @param role     Identifier of the unique role.
     * @param newOwner Address that becomes the new (sole) owner of the role.
     */
    event UniqueRoleTransferred(bytes32 indexed role, address indexed newOwner);

    /**
     * @notice Grants `role` to `account`.
     *
     * @param role The role to be granted.
     * @param account The account for granting the role.
     */
    function grantRole(bytes32 role, address account) external;

    /**
     * @notice Revokes `role` from `account`.
     *
     * @param role The role to be revoked.
     * @param account The account for revoking the role.
     */
    function revokeRole(bytes32 role, address account) external;

    /**
     * @notice Transfers `uniqueRole` from the previous role owner to `newOwner`.
     *
     * @dev Passing the zero address as `newOwner` will effectively revoke the
     *      role without assigning it to anyone.
     *
     * @param uniqueRole The role to be transferred.
     * @param newOwner   The new owner of the unique role (may be address(0)).
     */
    function transferUniqueRole(bytes32 uniqueRole, address newOwner) external;

    /**
     * @notice Checks if `account` has been granted `role`.
     *
     * @dev Reverts with {RoleSystemZeroAddress} when `account` is the zero address.
     *
     * @param role    The role to query.
     * @param account The account to query.
     * @return true if `account` possesses `role`, false otherwise.
     */
    function hasRole(bytes32 role, address account) external view returns (bool);

    /**
     * @notice Returns the sole owner of `uniqueRole`.
     *
     * @dev Reverts with {RoleSystemZeroAddress} when the role is currently
     *      unassigned.
     *
     * @param uniqueRole The unique role to query.
     * @return owner Address of the current role owner.
     */
    function uniqueRoleOwner(bytes32 uniqueRole) external view returns (address owner);

    /**
     * @dev Thrown when a function restricted to the main role owner is called
     *      by another account.
     */
    error RoleSystemNotMain();

    /**
     * @dev Thrown when the zero address is supplied where a non-zero address is required.
     */
    error RoleSystemZeroAddress();

    /**
     * @dev Thrown when a constructor argument at index `argIndex` is invalid.
     */
    error RoleSystemMisconfiguration(uint256 argIndex);
}
