// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

interface IMarket {
    struct Order {
        address seller;
        uint256 tokenId;
        uint256 price;
        OrderStatus status;
        address[] participants;
        uint256[] shares;
    }

    enum OrderStatus {
        NotExists,
        Placed,
        Bought,
        Cancelled
    }

    event Placed(uint256 indexed orderId, uint256 indexed tokenId, address indexed seller, uint256 price);
    event Bought(
        uint256 indexed orderId,
        uint256 indexed tokenId,
        address indexed buyer,
        address seller,
        uint256 price
    );
    event Cancelled(uint256 indexed orderId, uint256 indexed tokenId, address indexed seller);

    /**
     * Transfer NFT to Market contract
     * Place new Order
     */
    function place(
        uint256 tokenId,
        uint256 price,
        uint256 expiredBlock,
        address[] memory participants,
        uint256[] memory shares,
        bytes memory signature
    ) external;

    /**
     * Receive ETH
     * Distribute ETH between participants according to shares
     * Transfer NFT to buyer
     */
    function buy(uint256 orderId) external payable;

    /**
     * Cancel Order
     * Transfer NFT back to seller
     */
    function cancel(uint256 orderId) external;
}
