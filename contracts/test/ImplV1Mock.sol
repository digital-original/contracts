// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

contract ImplV1Mock {
    uint public count;

    function increment() external {
        count = count + 1;
    }
}
