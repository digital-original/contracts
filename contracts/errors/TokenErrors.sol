// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

error TokenUnauthorizedAccount(address account);
error TokenCannotBeBurned(uint256 tokenId);
error TokenInvalidMinter(address minter);
error NotTrustedReceiver(address receiver);
