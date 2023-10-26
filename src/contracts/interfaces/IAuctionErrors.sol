// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/**
 * @title IAuctionErrors.
 *
 * @notice Interface of the custom errors for Auction contract.
 */
/**
 * TODO_DOC
 */
interface IAuctionErrors {
    error AuctionTimeIsUp(uint256 deadline);
    error AuctionStillGoing(uint256 deadline);
    error AuctionInvalidBuyer(address buyer);
    error AuctionNotEnoughEther(uint256 value, uint256 nextRaise);
    error AuctionOrderNotExist(uint256 orderId);
    error AuctionInvalidDeadline(uint256 deadline, uint256 currentTimestamp);
}
