// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

/**
 * @title ITransferChecker.
 *
 * @notice TransferChecker contract interface.
 * @notice TransferChecker contract provides logic for checking of a ERC712 token transfer.
 */
interface ITransferChecker {
    /**
     * @notice Checks token transferring.
     *
     * @dev Throws if transferring is not valid.
     */
    function check(address from, address to, uint256 tokenId) external view;
}
