// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

error MarketInvalidBuyer(address buyer);
error MarketInvalidAmount(uint256 amount, uint256 price);
error MarketUnauthorizedAccount(address account);
error MarketOrderNotExist(uint256 orderId);
