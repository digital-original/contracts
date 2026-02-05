// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.20;

import {RoleSystemStorage} from "./RoleSystemStorage.sol";
import {IRoleSystem} from "./IRoleSystem.sol";

/**
 * @title RoleSystem
 *
 * @notice Concrete implementation of {IRoleSystem}. Stores role mappings in an
 *         unstructured-storage slot defined by {RoleSystemStorage} and exposes simple
 *         grant/revoke/transfer helpers restricted to the immutable {MAIN} administrator.
 */
contract RoleSystem is IRoleSystem {
    /**
     * @notice Account endowed with full administrative privileges over the role system (grant,
     *         revoke, transfer unique roles).
     */
    address public immutable MAIN;

    /**
     * @notice Restricts a function so it can only be executed by {MAIN}. Reverts with
     *      {RoleSystemNotMain} otherwise.
     */
    modifier onlyMain() {
        if (msg.sender != MAIN) {
            revert RoleSystemNotMain();
        }

        _;
    }

    /**
     * @notice Restricts a function so it can only be executed by an account that has `role`.
     *      Reverts with {RoleSystemUnauthorizedAccount} otherwise.
     *
     * @param role The role required to call the function.
     */
    modifier onlyRole(bytes32 role) {
        if (!hasRole(role, msg.sender)) {
            revert RoleSystemUnauthorizedAccount(msg.sender, role);
        }

        _;
    }

    /**
     * @notice Contract constructor.
     *
     * @param main Address that will be set as {MAIN}. Cannot be zero.
     *
     * @dev Reverts with {RoleSystemMisconfiguration} if `main` is the zero address.
     */
    constructor(address main) {
        if (main == address(0)) revert RoleSystemMisconfiguration(0);

        MAIN = main;
    }

    /**
     * @inheritdoc IRoleSystem
     */
    function grantRole(bytes32 role, address account) external onlyMain {
        _requireNotZeroAddress(account);

        RoleSystemStorage.Layout storage $ = RoleSystemStorage.layout();

        $.hasRole[role][account] = true;

        emit RoleGranted(role, account);
    }

    /**
     * @inheritdoc IRoleSystem
     */
    function revokeRole(bytes32 role, address account) external onlyMain {
        _requireNotZeroAddress(account);

        RoleSystemStorage.Layout storage $ = RoleSystemStorage.layout();

        $.hasRole[role][account] = false;

        emit RoleRevoked(role, account);
    }

    /**
     * @inheritdoc IRoleSystem
     */
    function transferUniqueRole(bytes32 uniqueRole, address newOwner) external onlyMain {
        RoleSystemStorage.Layout storage $ = RoleSystemStorage.layout();

        $.uniqueRoleOwner[uniqueRole] = newOwner;

        emit UniqueRoleTransferred(uniqueRole, newOwner);
    }

    /**
     * @inheritdoc IRoleSystem
     */
    function hasRole(bytes32 role, address account) public view returns (bool) {
        _requireNotZeroAddress(account);

        RoleSystemStorage.Layout storage $ = RoleSystemStorage.layout();

        return $.hasRole[role][account];
    }

    /**
     * @inheritdoc IRoleSystem
     */
    function uniqueRoleOwner(bytes32 uniqueRole) public view returns (address owner) {
        RoleSystemStorage.Layout storage $ = RoleSystemStorage.layout();

        owner = $.uniqueRoleOwner[uniqueRole];

        _requireNotZeroAddress(owner);
    }

    /**
     * @notice Internal helper that standardises zero-address checks across the contract.
     *
     * @dev Reverts with {RoleSystemZeroAddress} if `account` is the zero address.
     *
     * @param account The address to check.
     */
    function _requireNotZeroAddress(address account) private pure {
        if (account == address(0)) {
            revert RoleSystemZeroAddress();
        }
    }
}
