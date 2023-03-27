// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

/**
 * @title IMarket.
 * @notice Market contract interface.
 */
interface IMarket {
    struct Order {
        // TODO: does it make any sense to rename seller to owner?
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

    /// @dev Triggered when order was placed.
    event Placed(uint256 indexed orderId, uint256 indexed tokenId, address indexed seller, uint256 price);

    /// @dev Triggered when token was bought.
    event Bought(
        uint256 indexed orderId,
        uint256 indexed tokenId,
        address indexed buyer,
        address seller,
        uint256 price
    );

    /// @dev Triggered when order was cancelled.
    event Cancelled(uint256 indexed orderId, uint256 indexed tokenId, address indexed seller);

    /**
     * @notice Transfers token to Market and places token sale order.
     * @param tokenId Token for sale.
     * @param price Token price.
     * @param expiredBlock Block number until which `signature` is valid.
     * @param participants Array with addresses between which reward will be distributed.
     * @param shares Array with rewards amounts,
     *   order of `shares` corresponds to order of `participants`,
     *   total shares must be equal to `price`.
     * @param signature [EIP-712](https://eips.ethereum.org/EIPS/eip-712) signature.
     *   Signature must include `expiredBlock` and can include other data for validation.
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
     * @notice Distributes rewards and transfers token to buyer, close sale order.
     * @param orderId Order id.
     */
    function buy(uint256 orderId) external payable;

    /**
     * @notice Cancels token sale order, transfers token back to seller.
     * @param orderId Order id.
     */
    function cancel(uint256 orderId) external;
}
