// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.20;

/**
 * @title ICurrencyManager
 * @notice Manages the list of allowed currencies for market transactions.
 */
interface ICurrencyManager {
    /**
     * @notice Emitted when the status of a currency is updated.
     * @param currency The address of the currency contract.
     * @param allowed True if the currency is allowed.
     */
    event CurrencyStatusUpdated(address currency, bool allowed);

    /**
     * @notice Updates the status of a currency.
     * @param currency The address of the currency contract.
     * @param allowed The new status of the currency.
     */
    function updateCurrencyStatus(address currency, bool allowed) external;

    /**
     * @notice Checks if a currency is allowed.
     * @param currency The address of the currency to check.
     * @return allowed True if the currency is allowed.
     */
    function currencyAllowed(address currency) external view returns (bool allowed);

    /// @dev Thrown when attempting to set the status of the zero address as a currency.
    error CurrencyManagerZeroAddress();
}
