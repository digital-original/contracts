// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.20;

import {RoleSystem} from "../role-system/RoleSystem.sol";
import {Roles} from "../Roles.sol";
import {CurrencyManagerStorage} from "./CurrencyManagerStorage.sol";
import {ICurrencyManager} from "./ICurrencyManager.sol";

/**
 * @title CurrencyManager
 * @notice Abstract contract that implements the logic for managing allowed currencies.
 */
abstract contract CurrencyManager is ICurrencyManager, RoleSystem {
    /**
     * @notice Updates the status of a currency.
     * @dev This function can only be called by an account with the ADMIN_ROLE.
     * @param currency The address of the currency contract.
     * @param allowed The new status of the currency.
     */
    function updateCurrencyStatus(address currency, bool allowed) external onlyRole(Roles.ADMIN_ROLE) {
        if (currency == address(0)) {
            revert CurrencyManagerZeroAddress();
        }

        CurrencyManagerStorage.Layout storage $ = CurrencyManagerStorage.layout();

        $.allowed[currency] = allowed;

        emit CurrencyStatusUpdated(currency, allowed);
    }

    /**
     * @notice Checks if a currency is allowed.
     * @param currency The address of the currency to check.
     * @return allowed True if the currency is allowed.
     */
    function currencyAllowed(address currency) external view returns (bool allowed) {
        return _currencyAllowed(currency);
    }

    /**
     * @notice Internal function to check if a currency is allowed.
     * @param currency The address of the currency to check.
     * @return allowed True if the currency is allowed.
     */
    function _currencyAllowed(address currency) internal view returns (bool allowed) {
        CurrencyManagerStorage.Layout storage $ = CurrencyManagerStorage.layout();

        return $.allowed[currency];
    }
}
