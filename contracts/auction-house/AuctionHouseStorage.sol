// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {IAuctionHouse} from "./IAuctionHouse.sol";

/**
 * @title AuctionHouseStorage.
 *
 * @notice AuctionHouseStorage library provides access to AuctionHouse storage layout.
 */
library AuctionHouseStorage {
    bytes32 private constant STORAGE_SLOT =
        keccak256(abi.encode(uint256(keccak256("digital-original.storage.AuctionHouse")) - 1)) &
            ~bytes32(uint256(0xff));

    /**
     * @custom:storage-location erc7201:digital-original.storage.AuctionHouse
     */
    struct Layout {
        mapping(uint256 auctionId => IAuctionHouse.Auction) auctions;
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
