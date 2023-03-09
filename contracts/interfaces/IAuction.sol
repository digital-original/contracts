// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

interface IAuction {
    struct Order {
        address seller;
        address buyer;
        uint256 tokenId;
        uint256 price;
        uint256 endBlock;
        uint256 priceStep;
        OrderStatus status;
        address[] participants;
        uint256[] shares;
    }

    enum OrderStatus {
        NotExists,
        Placed,
        Ended,
        Cancelled
    }

    event Placed(uint256 indexed orderId, uint256 indexed tokenId, address indexed seller, uint256 price);
    event Raised(
        uint256 indexed orderId,
        uint256 indexed tokenId,
        address indexed buyer,
        address seller,
        uint256 price
    );
    event Ended(uint256 indexed orderId, uint256 indexed tokenId, address indexed buyer, address seller, uint256 price);
    event Cancelled(uint256 indexed orderId, uint256 indexed tokenId, address indexed seller);

    /**
     * Transfer NFT to Auction contract
     * Place new Order
     */
    function place(
        uint256 tokenId,
        uint256 price,
        uint256 endBlock,
        uint256 priceStep,
        uint256 expiredBlock,
        address[] memory participants,
        uint256[] memory shares,
        bytes memory signature
    ) external;

    /**
     * Receive ETH
     * Raise Order price
     * Set new buyer
     * Transfer ETH from previous buyer back (maybe it will be better to create withdraw method)
     */
    function raise(uint256 orderId) external payable;

    /**
     * > if Order buyer exists
     * Distribute ETH between rewardReceivers according to rewardRatios
     * Transfer NFT to buyer
     *
     * > if Order buyer does not exist
     * Approve NFT for Market contract
     * Place a sales NFT order in Market contract from seller
     */
    function end(uint256 orderId) external;

    /**
     * Cancel Order
     * Transfer NFT back to seller
     */
    // function cancel(uint256 orderId) external;
}
