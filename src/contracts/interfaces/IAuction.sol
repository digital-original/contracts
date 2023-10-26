// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/**
 * @title IAuction.
 *
 * @notice Auction contract interface.
 * @notice Auction contract provides logic for creating auction with ERC721 tokens.
 */
interface IAuction {
    /**
     * @dev Auction order struct
     */
    struct Order {
        address seller;
        address buyer;
        uint256 tokenId;
        uint256 price;
        uint256 priceStep;
        uint256 deadline;
        OrderStatus status;
        address[] participants;
        uint256[] shares;
    }

    /**
     * @dev Auction order statuses
     */
    enum OrderStatus {
        NotExists,
        Placed,
        Ended
    }

    /**
     * @dev Triggered when order was placed.
     */
    // prettier-ignore
    event Placed(
        uint256 indexed orderId,
        uint256 indexed tokenId,
        address indexed seller,
        uint256 price,
        uint256 priceStep,
        uint256 deadline
    );

    /**
     * @dev Triggered when order price was raised.
     */
    // prettier-ignore
    event Raised(
        uint256 indexed orderId,
        uint256 indexed tokenId,
        address indexed buyer,
        uint256 price
    );

    /**
     * @dev Triggered when auction was ended.
     */
    // prettier-ignore
    event Ended(
        uint256 indexed orderId,
        uint256 indexed tokenId,
        address indexed buyer,
        address seller,
        uint256 price
    );

    /**
     * @notice Raises auction order price, sets new buyer and locks Ether,
     *   return previous locked Ether to previous buyer if order already has buyer.
     *
     * @param orderId Auction order ID.
     */
    function raise(uint256 orderId) external payable;

    /**
     * @notice Ends auction and closes order. Distributes rewards and transfers
     *   token to buyer if order has buyer, in another case transfers token back to seller.
     *
     * @param orderId Auction order ID.
     */
    function end(uint256 orderId) external;

    /**
     * @notice Returns auction order by order ID.
     *
     * @param orderId Order ID.
     *
     * @return Auction order.
     */
    function order(uint256 orderId) external view returns (Order memory);
}
