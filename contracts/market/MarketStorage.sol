// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.20;

/**
 * @title MarketStorage
 *
 * @notice MarketStorage library provides access to Market storage layout.
 */
library MarketStorage {
    bytes32 private constant STORAGE_SLOT =
        keccak256(abi.encode(uint256(keccak256("digital-original.storage.Market")) - 1)) &
            ~bytes32(uint256(0xff));

    /**
     * @custom:storage-location erc7201:digital-original.storage.Market
     */
    struct Layout {
        mapping(address maker => mapping(bytes32 nonce => bool)) makerOrderNonce;
    }

    /**
     * @dev Returns storage layout
     */
    function layout() internal pure returns (Layout storage $) {
        bytes32 slot = STORAGE_SLOT;

        // solhint-disable-next-line
        assembly {
            $.slot := slot
        }
    }
}
