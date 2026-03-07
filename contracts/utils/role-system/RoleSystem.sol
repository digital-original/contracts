// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.20;

import {RoleSystemStorage} from "./RoleSystemStorage.sol";
import {IRoleSystem} from "./IRoleSystem.sol";

/**
 * @title RoleSystem
 * @notice A simple role management system that supports both unique and non-unique roles.
 *         The main account has the exclusive authority to grant, revoke and transfer roles.
 */
contract RoleSystem is IRoleSystem {
    /**
     * @notice Account endowed with full administrative privileges over the role system (grant,
     *         revoke, transfer unique roles). The main account is expected to be a multisig
     */
    address public immutable MAIN;

    /// @notice Restricts a function so it can only be executed by {MAIN}, reverts otherwise.
    modifier onlyMain() {
        if (msg.sender != MAIN) {
            revert RoleSystemNotMain();
        }
        _;
    }

    /**
     * @notice Restricts a function so it can only be executed by an account that has `role`,
     *         reverts otherwise.
     * @param role The role required to call the function.
     */
    modifier onlyRole(bytes32 role) {
        if (!_hasRole(role, msg.sender)) {
            revert RoleSystemUnauthorizedAccount(msg.sender, role);
        }

        _;
    }

    /**
     * @notice Initializes the main account.
     * @param main Address that will be set as {MAIN}.
     */
    constructor(address main) {
        if (main == address(0)) revert RoleSystemMisconfiguration(0);

        MAIN = main;
    }

    /**
     * @notice Grants `role` to `account`.
     * @param role The role to be granted.
     * @param account The account for granting the role.
     */
    function grantRole(bytes32 role, address account) external onlyMain {
        _requireNotZeroAddress(account);

        RoleSystemStorage.Layout storage $ = RoleSystemStorage.layout();

        if ($.hasRole[role][account]) {
            revert RoleSystemAlreadyHasRole(role, account);
        }

        $.hasRole[role][account] = true;

        emit RoleGranted(role, account);
    }

    /**
     * @notice Revokes `role` from `account`.
     * @param role The role to be revoked.
     * @param account The account for revoking the role.
     */
    function revokeRole(bytes32 role, address account) external onlyMain {
        _requireNotZeroAddress(account);

        RoleSystemStorage.Layout storage $ = RoleSystemStorage.layout();

        if (!$.hasRole[role][account]) {
            revert RoleSystemMissingRole(role, account);
        }

        $.hasRole[role][account] = false;

        emit RoleRevoked(role, account);
    }

    /**
     * @notice Transfers `uniqueRole` from the previous role owner to `newOwner`.
     * @dev Passing the zero address as `newOwner` will effectively revoke the role without
     *      assigning it to anyone.
     * @param uniqueRole The role to be transferred.
     * @param newOwner The new owner of the unique role (may be address(0)).
     */
    function transferUniqueRole(bytes32 uniqueRole, address newOwner) external onlyMain {
        RoleSystemStorage.Layout storage $ = RoleSystemStorage.layout();

        address oldOwner = $.uniqueRoleOwner[uniqueRole];

        if (oldOwner == newOwner) {
            revert RoleSystemAlreadyHasRole(uniqueRole, newOwner);
        }

        $.uniqueRoleOwner[uniqueRole] = newOwner;

        emit UniqueRoleTransferred(uniqueRole, oldOwner, newOwner);
    }

    /**
     * @notice Checks if `account` has been granted `role`.
     * @param role The role to query.
     * @param account The account to query.
     * @return True if `account` possesses `role`.
     */
    function hasRole(bytes32 role, address account) external view returns (bool) {
        RoleSystemStorage.Layout storage $ = RoleSystemStorage.layout();

        return $.hasRole[role][account];
    }

    /**
     * @notice Returns the owner of `uniqueRole`.
     * @param uniqueRole The unique role to query.
     * @return owner Address of the current role owner.
     */
    function uniqueRoleOwner(bytes32 uniqueRole) external view returns (address) {
        RoleSystemStorage.Layout storage $ = RoleSystemStorage.layout();

        return $.uniqueRoleOwner[uniqueRole];
    }

    /**
     * @notice Internal variant of {hasRole} that reverts when `account` is the zero address.
     * @param role The role to query.
     * @param account The account to query.
     * @return True if `account` possesses `role`.
     */
    function _hasRole(bytes32 role, address account) internal view returns (bool) {
        _requireNotZeroAddress(account);

        RoleSystemStorage.Layout storage $ = RoleSystemStorage.layout();

        return $.hasRole[role][account];
    }

    /**
     * @notice Internal variant of {uniqueRoleOwner} that reverts when the role is unassigned.
     * @param uniqueRole The unique role to query.
     * @return owner Address of the current role owner.
     */
    function _uniqueRoleOwner(bytes32 uniqueRole) internal view returns (address owner) {
        RoleSystemStorage.Layout storage $ = RoleSystemStorage.layout();

        owner = $.uniqueRoleOwner[uniqueRole];

        _requireNotZeroAddress(owner);
    }

    /**
     * @notice Internal helper that standardizes zero-address checks across the contract.
     * @param account The address to check.
     */
    function _requireNotZeroAddress(address account) private pure {
        if (account == address(0)) {
            revert RoleSystemZeroAddress();
        }
    }
}
