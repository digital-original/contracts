// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

abstract contract OrderCounter {
    /**
     * @dev Number of orders.
     */
    uint256 public orderCount;

    /**
     * @dev Increments order counter.
     *
     * @return New order ID.
     */
    function _useOrderId() internal returns (uint256) {
        return orderCount++;
    }

    /**
     * @dev This empty reserved space.
     *
     * slot 1 - OrderCounter::orderCount
     */
    uint256[19] private __gap;
}
