// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/**
 * @title ITokenErrors.
 *
 * @notice Interface of the custom errors for Token contract.
 */
interface ITokenErrors {
    error TokenUnauthorizedAccount(address account);
    error TokenCannotBeBurned(uint256 tokenId);
    error TokenInvalidMinter(address minter);
    error TokenInvalidTransferChecker(address transferChecker);
    error NotTrustedReceiver(address receiver);
}
