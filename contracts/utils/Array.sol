// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.20;

library Array {
    function push(
        uint256[] calldata array,
        uint256 element
    ) internal pure returns (uint256[] memory result) {
        unchecked {
            result = new uint256[](array.length + 1);

            uint256 i = 0;

            for (; i < array.length; i++) {
                result[i] = array[i];
            }

            result[i] = element;
        }
    }

    function push(
        address[] calldata array,
        address element
    ) internal pure returns (address[] memory result) {
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
