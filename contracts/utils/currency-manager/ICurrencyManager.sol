// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface ICurrencyManager {
    event CurrencyStatusUpdated(address currency, bool allowed);

    function updateCurrencyStatus(address currency, bool allowed) external;

    function currencyAllowed(address currency) external view returns (bool);
}
