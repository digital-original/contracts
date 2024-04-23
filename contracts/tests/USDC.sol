// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract USDC is ERC20 {
    constructor() ERC20("Test USDC", "Test USDC") {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint() external {
        _mint(msg.sender, 50_000e6);
    }
}
