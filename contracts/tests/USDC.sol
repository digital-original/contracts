// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract USDC is ERC20 {
    constructor() ERC20("Test USDC", "Test USDC") {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mintAndApprove(address spender, uint256 value) external {
        _mint(msg.sender, value);
        _approve(msg.sender, spender, value);
    }
}
