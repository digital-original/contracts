// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/**
 * @title IMarket.
 *
 * @notice Market contract interface.
 * @notice Market contract provides logic for selling and buying ERC721 tokens.
 */
interface IMarket {
    // TODO: Do you need to split object struct into separate states for upgradeability?
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
    // prettier-ignore
    event Placed(
        uint256 indexed orderId,
        uint256 indexed tokenId,
        address indexed seller,
        uint256 price
    );

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
    // prettier-ignore
    event Cancelled(
        uint256 indexed orderId,
        uint256 indexed tokenId,
        address indexed seller
    );

    /**
     * @notice Distributes rewards and transfers token to buyer.
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

    error MarketInvalidBuyer(address buyer);
    error MarketInsufficientPayment(uint256 amount, uint256 price);
    error MarketUnauthorizedAccount(address account);
    error MarketOrderNotExist(uint256 orderId);
    error MarketOrderNotPlaced(uint256 orderId);
}
