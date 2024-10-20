// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.20;

import {RoleSystemStorage} from "./RoleSystemStorage.sol";
import {IRoleSystem} from "./IRoleSystem.sol";

/**
 * @title RoleSystem
 *
 * @notice The contract provides the roles system to control access and get accounts by role.
 */
abstract contract RoleSystem is IRoleSystem {
    /**
     * @dev The main account. The account can grant and revoke roles and transfer unique roles.
     */
    address public immutable MAIN;

    /**
     * @dev Sets the main account.
     *
     * @param main The main account for managing the role system.
     */
    constructor(address main) {
        if (main == address(0)) revert RoleSystemMisconfiguration(0);

        MAIN = main;
    }

    /**
     * @dev Throws if sender is not the main account
     */
    modifier onlyMain() {
        if (msg.sender != MAIN) {
            revert RoleSystemNotMain();
        }

        _;
    }

    /* ############################################################
                                ROLES
    ############################################################ */

    /**
     * @inheritdoc IRoleSystem
     */
    function grandRole(bytes32 role, address account) external onlyMain {
        if (!hasRole(role, account)) {
            RoleSystemStorage.Layout storage $ = RoleSystemStorage.layout();

            $._roles[role][account] = true;

            emit RoleGranted(role, account);
        }
    }

    /**
     * @inheritdoc IRoleSystem
     */
    function revokeRole(bytes32 role, address account) external onlyMain {
        if (hasRole(role, account)) {
            RoleSystemStorage.Layout storage $ = RoleSystemStorage.layout();

            $._roles[role][account] = false;

            emit RoleRevoked(role, account);
        }
    }

    /**
     * @inheritdoc IRoleSystem
     */
    function hasRole(bytes32 role, address account) public view returns (bool) {
        if (account == address(0)) {
            revert RoleSystemZeroAddress();
        }

        RoleSystemStorage.Layout storage $ = RoleSystemStorage.layout();

        return $._roles[role][account];
    }

    /**
     * @dev Throws if `account` does not have `role`.
     */
    function _requireRole(bytes32 role, address account) internal view {
        if (!hasRole(role, account)) {
            revert RoleSystemUnauthorizedAccount(account, role);
        }
    }

    /* ############################################################
                            UNIQUE_ROLES
    ############################################################ */

    /**
     * @inheritdoc IRoleSystem
     */
    function transferUniqueRole(bytes32 uniqueRole, address to) external onlyMain {
        RoleSystemStorage.Layout storage $ = RoleSystemStorage.layout();

        address from = $._uniqueRoles[uniqueRole];

        $._uniqueRoles[uniqueRole] = to;

        emit UniqueRoleTransferred(from, to, uniqueRole);
    }

    /**
     * @inheritdoc IRoleSystem
     */
    function uniqueRoleAccount(bytes32 uniqueRole) public view returns (address account) {
        RoleSystemStorage.Layout storage $ = RoleSystemStorage.layout();

        account = $._uniqueRoles[uniqueRole];

        if (account == address(0)) {
            revert RoleSystemZeroAddress();
        }
    }

    /**
     * @dev Throws if `account` does not have `uniqueRole`.
     */
    function _requireUniqueRole(bytes32 uniqueRole, address account) internal view {
        if (uniqueRoleAccount(uniqueRole) != account) {
            revert RoleSystemUnauthorizedAccount(account, uniqueRole);
        }
    }
}
