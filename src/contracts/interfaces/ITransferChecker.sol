// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

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
     *
     * @param tokenId Token ID.
     * @param to Token receiver.
     * @param auth Auth.
     */
    function check(address to, uint256 tokenId, address auth) external view;
}
