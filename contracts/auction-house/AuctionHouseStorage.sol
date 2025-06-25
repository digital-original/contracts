// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.20;

import {IAuctionHouse} from "./IAuctionHouse.sol";

/**
 * @title AuctionHouseStorage
 *
 * @notice Defines the storage layout for {AuctionHouse}. Using a deterministic slot
 * makes the module safe for use behind proxies and alongside other upgradeable components.
 */
library AuctionHouseStorage {
    /// @dev Unique storage slot for the layout, computed using EIP-7201 convention.
    bytes32 private constant STORAGE_SLOT =
        keccak256(abi.encode(uint256(keccak256("digital-original.storage.AuctionHouse")) - 1)) &
            ~bytes32(uint256(0xff));

    /**
     * @custom:storage-location erc7201:digital-original.storage.AuctionHouse
     */
    struct Layout {
        mapping(uint256 auctionId => IAuctionHouse.Auction) auction;
        mapping(uint256 tokenId => uint256) tokenAuctionId;
    }

    /**
     * @notice Returns a pointer to the storage layout.
     *
     * @return $ The pointer to the Layout struct in storage.
     */
    function layout() internal pure returns (Layout storage $) {
        bytes32 slot = STORAGE_SLOT;

        // solhint-disable-next-line
        assembly {
            $.slot := slot
        }
    }
}
