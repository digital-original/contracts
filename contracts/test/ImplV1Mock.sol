// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

contract ImplV1Mock {
    uint256 public count;

    constructor() {}

    function increment() external {
        count = count + 1;
    }
}
