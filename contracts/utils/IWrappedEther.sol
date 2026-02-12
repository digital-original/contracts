// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title IWrappedEther
 * @notice Defines the interface for the wrapped ether external contract.
 */
interface IWrappedEther is IERC20 {
    /**
     * @dev Locks sent ether and mints the same amount of wrapped ether for the caller.
     */
    function deposit() external payable;

    /**
     * @dev Burns the amount of the caller's wrapped ether and sends the same amount of ether to the caller.
     * @param amount The amount to be withdrawn
     */
    function withdraw(uint256 amount) external;
}
