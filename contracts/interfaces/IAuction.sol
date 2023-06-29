// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

// TODO: Think about moving `onERC721Received` to IBaseMarket

/**
 * @title IAuction.
 *
 * @notice Auction contract interface.
 * @notice Auction contract provides logic for creating auction with ERC-721 tokens.
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
     * @notice Places token sale auction order and locks token on the contract.
     *
     * @dev This method is the callback according to
     *   [IERC721Receiver](https://docs.openzeppelin.com/contracts/4.x/api/token/erc721#IERC721Receiver).
     * @dev This method can trigger only the collection contract during `safeTransfer`.
     *
     * @param operator Collection caller.
     * @param from Token owner.
     * @param tokenId Token for sale.
     * @param data Data needed for auction order placing.
     */
    function onERC721Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes calldata data
    ) external returns (bytes4);

    /**
     * @notice Raises auction order price, sets new buyer and locks Ether,
     *   return previous locked Ether to previous buyer if order already has buyer.
     *
     * @param orderId Auction order id.
     */
    function raise(uint256 orderId) external payable;

    /**
     * @notice Ends auction and closes order. Distributes rewards and transfers
     *   token to buyer if order has buyer, in another case transfers token back to seller.
     *
     * @param orderId Auction order id.
     */
    function end(uint256 orderId) external;

    /**
     * @notice Returns auction order by orderId.
     *
     * @param orderId Order id.
     *
     * @return Auction order.
     */
    function order(uint256 orderId) external view returns (Order memory);
}
