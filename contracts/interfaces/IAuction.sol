// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface ERC721 {}

interface Auction {
    struct Lot {
        address seller;
        address buyer;
        ERC721 collection;
        uint256 tokenId;
        uint256 price;
        uint256 endAt;
        uint256 raisedAt;
        LotStatus status;
        address[] rewardReceivers;
        uint8[] rewardRatios;
    }

    enum LotStatus {
        Active,
        Finished,
        Cancelled
    }

    event Placed();
    event Raised();
    event Finished();
    event Canceled();

    /**
     * Transfer NFT to Auction contract
     * Place new Lot
     */
    function place(Lot calldata lot) external;

    /**
     * Receive ETH
     * Raise Lot price
     * Set new buyer
     * Transfer ETH from previous buyer back (maybe it will be better to create withdraw method)
     */
    function raise() external;

    /**
     * > if Lot buyer exists
     * Distribute ETH between rewardReceivers according to rewardRatios
     * Transfer NFT to buyer
     *
     * > if Lot buyer does not exist
     * Approve NFT for Market contract
     * Place a sales NFT order in Market contract from seller
     */
    function finish() external;

    /**
     * Cancel Lot
     * Transfer NFT back to seller
     */
    function cancel() external;
}
