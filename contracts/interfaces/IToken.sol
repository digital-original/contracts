// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

interface IToken {
    error TokenUnauthorizedAccount(address account);
    error TokenNotTrustedReceiver(address receiver);
    error TokenInsufficientPayment(uint256 amount);
}
