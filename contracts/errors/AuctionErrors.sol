// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

error AuctionTimeIsUp(uint256 endTime);
error AuctionStillGoing(uint256 endTime);
error AuctionInvalidBuyer(address buyer);
error AuctionNotEnoughEther(uint256 value, uint256 nextRaise);
error AuctionOrderNotExist(uint256 orderId);
error AuctionInvalidEndTime(uint256 endTime, uint256 currentTime);
