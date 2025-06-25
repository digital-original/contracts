// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.20;

/**
 * @title Array
 *
 * @notice A utility library for working with calldata arrays.
 */
library Array {
    /**
     * @notice Appends a `uint256` element to a `uint256` calldata array.
     *
     * @param array The calldata array to which the element will be added.
     * @param element The `uint256` element to add.
     *
     * @return result A new memory array with the element appended.
     */
    function push(uint256[] calldata array, uint256 element) internal pure returns (uint256[] memory result) {
        unchecked {
            result = new uint256[](array.length + 1);

            uint256 i = 0;

            for (; i < array.length; i++) {
                result[i] = array[i];
            }

            result[i] = element;
        }
    }

    /**
     * @notice Appends an `address` element to an `address` calldata array.
     *
     * @param array The calldata array to which the element will be added.
     * @param element The `address` element to add.
     *
     * @return result A new memory array with the element appended.
     */
    function push(address[] calldata array, address element) internal pure returns (address[] memory result) {
        unchecked {
            result = new address[](array.length + 1);

            uint256 i = 0;

            for (; i < array.length; i++) {
                result[i] = array[i];
            }

            result[i] = element;
        }
    }
}
