// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {RoleSystem} from "../role-system/RoleSystem.sol";
import {Roles} from "../Roles.sol";
import {CurrencyManagerStorage} from "./CurrencyManagerStorage.sol";
import {ICurrencyManager} from "./ICurrencyManager.sol";

abstract contract CurrencyManager is ICurrencyManager, RoleSystem {
    function updateCurrencyStatus(address currency, bool allowed) external onlyRole(Roles.ADMIN_ROLE) {
        CurrencyManagerStorage.Layout storage $ = CurrencyManagerStorage.layout();

        $.allowed[currency] = allowed;

        emit CurrencyStatusUpdated(currency, allowed);
    }

    function currencyAllowed(address currency) public view returns (bool) {
        return CurrencyManagerStorage.layout().allowed[currency];
    }
}
