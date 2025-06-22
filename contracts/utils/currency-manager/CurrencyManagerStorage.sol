// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

library CurrencyManagerStorage {
    bytes32 private constant STORAGE_SLOT =
        keccak256(abi.encode(uint256(keccak256("digital-original.storage.CurrencyManager")) - 1)) &
            ~bytes32(uint256(0xff));

    /**
     * @custom:storage-location erc7201:digital-original.storage.CurrencyManager
     */
    struct Layout {
        mapping(address => bool) allowed;
    }

    function layout() internal pure returns (Layout storage $) {
        bytes32 slot = STORAGE_SLOT;

        // solhint-disable-next-line
        assembly {
            $.slot := slot
        }
    }
}
