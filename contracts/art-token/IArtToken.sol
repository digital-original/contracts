// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

interface IArtToken {
    error ArtTokenUnauthorizedAccount(address account);
    error ArtTokenNotTrustedReceiver(address receiver);
    error ArtTokenInsufficientPayment(uint256 amount);
}
