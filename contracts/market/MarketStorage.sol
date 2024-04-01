// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {IMarket} from "./IMarket.sol";

library MarketStorage {
    bytes32 private constant STORAGE_SLOT =
        keccak256(abi.encode(uint256(keccak256("digital-original.storage.Market")) - 1)) & ~bytes32(uint256(0xff));

    /**
     * @custom:storage-location erc7201:digital-original.storage.Market
     */
    struct Layout {
        uint256 ordersCount;
        mapping(uint256 orderId => IMarket.Order) orders;
    }

    function layout() internal pure returns (Layout storage $) {
        bytes32 slot = STORAGE_SLOT;

        // solhint-disable-next-line
        assembly {
            $.slot := slot
        }
    }
}
