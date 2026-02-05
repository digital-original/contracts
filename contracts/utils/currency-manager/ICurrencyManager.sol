// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.20;

/**
 * @title ICurrencyManager
 *
 * @notice Manages the list of allowed currencies for market transactions.
 */
interface ICurrencyManager {
    /**
     * @notice Emitted when the status of a currency is updated.
     *
     * @param currency The address of the currency contract.
     * @param allowed True if the currency is allowed, false otherwise.
     */
    event CurrencyStatusUpdated(address currency, bool allowed);

    /**
     * @notice Updates the status of a currency.
     *
     * @dev This function can only be called by an account with the ADMIN_ROLE.
     *
     * @param currency The address of the ERC20 token contract to update.
     * @param allowed The new status of the currency.
     */
    function updateCurrencyStatus(address currency, bool allowed) external;

    /**
     * @notice Checks if a currency is allowed.
     *
     * @param currency The address of the currency to check.
     *
     * @return allowed True if the currency is allowed, false otherwise.
     */
    function currencyAllowed(address currency) external view returns (bool allowed);
}
