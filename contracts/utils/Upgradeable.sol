// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

/**
 * @title Upgradeable
 *
 * @notice Upgradeable Contract based on [OpenZeppelin](https://docs.openzeppelin.com/) library.
 */
abstract contract Upgradeable is Initializable {
    /**
     * @notice Initializes contract.
     *
     * @dev Method should be invoked on proxy contract via `delegatecall`.
     *   See <https://docs.openzeppelin.com/upgrades-plugins/1.x/writing-upgradeable#initializers>.
     */
    function initialize() external virtual;
}
