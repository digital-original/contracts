// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.20;

import {RoleSystem} from "../role-system/RoleSystem.sol";
import {Roles} from "../Roles.sol";
import {CurrencyManagerStorage} from "./CurrencyManagerStorage.sol";
import {ICurrencyManager} from "./ICurrencyManager.sol";

/**
 * @title CurrencyManager
 *
 * @notice Abstract contract that implements the logic for managing allowed currencies.
 */
abstract contract CurrencyManager is ICurrencyManager, RoleSystem {
    /**
     * @inheritdoc ICurrencyManager
     */
    function updateCurrencyStatus(address currency, bool allowed) external onlyRole(Roles.ADMIN_ROLE) {
        CurrencyManagerStorage.Layout storage $ = CurrencyManagerStorage.layout();

        $.allowed[currency] = allowed;

        emit CurrencyStatusUpdated(currency, allowed);
    }

    /**
     * @inheritdoc ICurrencyManager
     */
    function currencyAllowed(address currency) external view returns (bool allowed) {
        return _currencyAllowed(currency);
    }

    function _currencyAllowed(address currency) internal view returns (bool allowed) {
        CurrencyManagerStorage.Layout storage $ = CurrencyManagerStorage.layout();

        return $.allowed[currency];
    }
}
