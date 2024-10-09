// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.20;

/**
 * @title IRoleSystem.
 *
 * @notice RoleSystem contract interface.
 */
interface IRoleSystem {
    /* ############################################################
                                ROLES
    ############################################################ */

    /**
     * @dev Emitted when `account` is granted `role`.
     */
    event RoleGranted(bytes32 indexed role, address indexed account);

    /**
     * @dev Emitted when `account` is revoked `role`.
     */
    event RoleRevoked(bytes32 indexed role, address indexed account);

    /**
     * @notice Grants `role` to `account`.
     *
     * @param role The role to be granted.
     * @param account The account for granting the role.
     */
    function grandRole(bytes32 role, address account) external;

    /**
     * @notice Revokes `role` from `account`.
     *
     * @param role The role to be revoked.
     * @param account The account for revoking the role.
     */
    function revokeRole(bytes32 role, address account) external;

    /**
     * @notice Returns true if the account is granted the role, false in if not granted.
     *
     * @param role The role to check.
     * @param account The account to check.
     *
     * @dev Throws if the account is zero account.
     */
    function hasRole(bytes32 role, address account) external view returns (bool);

    /* ############################################################
                            UNIQUE_ROLES
    ############################################################ */

    /**
     * @dev Emitted when `role` is transferred form `from` account to `to` account
     */
    event UniqueRoleTransferred(address indexed from, address indexed to, bytes32 indexed role);

    /**
     * @notice Transfers `uniqueRole` from the previous role owner to `account`.
     *
     * @dev Transfer a unique role to zero account to revoke the role.
     *
     * @param uniqueRole The role to be transferred.
     * @param account The account of the new role owner.
     */
    function transferUniqueRole(bytes32 uniqueRole, address account) external;

    /**
     * @notice Returns the account of the unique role owner.
     *
     * @param uniqueRole The unique role of the wanted account.
     *
     * @dev Throws if the wanted account is zero account.
     */
    function uniqueRoleAccount(bytes32 uniqueRole) external view returns (address account);

    /* ############################################################
                                ERRORS
    ############################################################ */

    /**
     * @dev The sender is not the main account.
     */
    error RoleSystemNotMain();

    /**
     * @dev Zero address was detected.
     */
    error RoleSystemZeroAddress();

    /**
     * @dev The account does not have the needed role.
     */
    error RoleSystemUnauthorizedAccount(address account, bytes32 neededRole);

    /**
     * @dev The constructor argument under index `argIndex` is invalid.
     */
    error RoleSystemMisconfiguration(uint256 argIndex);
}
