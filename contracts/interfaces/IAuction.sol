// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.16;

/**
 * @title IAuction.
 * @notice Auction contract interface.
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
        uint256 endBlock;
        uint256 priceStep;
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
    event Placed(uint256 indexed orderId, uint256 indexed tokenId, address indexed seller, uint256 price);

    /**
     * @dev Triggered when order price was raised.
     */
    event Raised(
        uint256 indexed orderId,
        uint256 indexed tokenId,
        address indexed buyer,
        address seller,
        uint256 price
    );

    /**
     * @dev Triggered when auction was ended.
     */
    event Ended(uint256 indexed orderId, uint256 indexed tokenId, address indexed buyer, address seller, uint256 price);

    /**
     * @dev Triggered when order was cancelled.
     */
    event Cancelled(uint256 indexed orderId, uint256 indexed tokenId, address indexed seller);

    /**
     * @notice Transfers token to Auction and places token sale auction order.
     * @param tokenId Token for sale.
     * @param price Initial token price.
     * @param endBlock Block number until which the auction continues.
     * @param priceStep Minimum price raise step.
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
        uint256 endBlock,
        uint256 priceStep,
        uint256 expiredBlock,
        address[] memory participants,
        uint256[] memory shares,
        bytes memory signature
    ) external;

    /**
     * @notice Raises auction order price, sets new buyer and locks Ether,
     *   return previous locked Ether to previous buyer if order already has buyer.
     * @param orderId Auction order id.
     */
    function raise(uint256 orderId) external payable;

    /**
     * @notice Ends auction and closes order. Distributes rewards and transfers
     *   token to buyer if order has buyer, in another case transfers token back to seller.
     * @param orderId Auction order id.
     */
    function end(uint256 orderId) external;

    /**
     * @notice Returns auction order by orderId.
     * @param orderId Order id.
     * @return order Auction order.
     */
    function order(uint256 orderId) external view returns (Order memory);
}
