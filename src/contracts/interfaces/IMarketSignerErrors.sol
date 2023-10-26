// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/**
 * @title IMarketSignerErrors.
 *
 * @notice Interface of the custom errors for MarketSigner contract.
 */
/**
 * TODO_DOC
 */
interface IMarketSignerErrors {
    error MarketSignerSignatureExpired(uint256 deadline, uint256 currentTimestamp);
    error MarketSignerUnauthorized();
}
