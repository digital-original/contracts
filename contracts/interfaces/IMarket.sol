// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

/**
 * @title IMarket.
 *
 * @notice Market contract interface.
 * @notice Market contract provides logic for selling and buying ERC-721 tokens.
 */
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
        Realized,
        Cancelled
    }

    /**
     * @dev Triggered when order was placed.
     */
    event Placed(uint256 indexed orderId, uint256 indexed tokenId, address indexed seller, uint256 price);

    /**
     * @dev Triggered when token was realize.
     */
    event Realized(
        uint256 indexed orderId,
        uint256 indexed tokenId,
        address indexed buyer,
        address seller,
        uint256 price
    );

    /**
     * @dev Triggered when order was cancelled.
     */
    event Cancelled(uint256 indexed orderId, uint256 indexed tokenId, address indexed seller);

    /**
     * @notice Distributes rewards and transfers token to buyer, closes sale order.
     *
     * @param orderId Order ID.
     */
    function realize(uint256 orderId) external payable;

    /**
     * @notice Cancels token sale order, transfers token back to seller.
     *
     * @param orderId Order ID.
     */
    function cancel(uint256 orderId) external;

    /**
     * @notice Returns order by order ID.
     *
     * @param orderId Order ID.
     *
     * @return Order.
     */
    function order(uint256 orderId) external view returns (Order memory);
}
