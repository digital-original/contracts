// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface ERC721 {}

interface Market {
    struct Item {
        address seller;
        ERC721 collection;
        uint256 tokenId;
        uint256 price;
        ItemStatus status;
        address[] rewardReceivers;
        uint8[] rewardRatios;
    }

    enum ItemStatus {
        Active,
        Sold,
        Cancelled
    }

    /**
     * Transfer NFT to Market contract
     * Place new Item
     */
    function place(Item calldata item) external;

    /**
     * Receive ETH
     * Distribute ETH between rewardReceivers according to rewardRatios
     * Transfer NFT to buyer
     */
    function buy() external;

    /**
     * Cancel Item
     * Transfer NFT back to seller
     */
    function cancel() external;
}
