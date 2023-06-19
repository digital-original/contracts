// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

contract ImplV2Mock {
    uint public count;

    function increment() external {
        count = count + 2;
    }
}
