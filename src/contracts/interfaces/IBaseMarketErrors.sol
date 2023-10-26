// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/**
 * @title IBaseMarketErrors.
 *
 * @notice Interface of the custom errors for BaseMaker contract.
 */
/**
 * TODO_DOC
 */
interface IBaseMarketErrors {
    error BaseMarketOrderNotPlaced(uint256 orderId);
    error BaseMarketUnauthorizedAccount(address account);
    error BaseMarketSendValueFailed();
    error BaseMarketInvalidSharesNumber();
    error BaseMarketInvalidSharesSum();
}
