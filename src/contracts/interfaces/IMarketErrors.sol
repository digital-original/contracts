// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/**
 * @title IMarketErrors.
 *
 * @notice Interface of the custom errors for Market contract.
 */
/**
 * TODO_DOC
 */
interface IMarketErrors {
    error MarketInvalidBuyer(address buyer);
    error MarketInvalidAmount(uint256 value, uint256 price);
    error MarketUnauthorizedAccount(address account);
    error MarketOrderNotExist(uint256 orderId);
}
