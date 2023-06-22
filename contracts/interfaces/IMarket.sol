// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

/**
 * @title IMarket.
 * @notice Market contract interface.
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
     * @notice Places token sale order and locks token on the contract.
     * @param operator Collection caller.
     * @param from Token owner.
     * @param tokenId Token for sale.
     * @param data Data needed for order placing.
     * @dev This method is the callback according to
     *   [IERC721Receiver](https://docs.openzeppelin.com/contracts/4.x/api/token/erc721#IERC721Receiver).
     * @dev This method can trigger only the collection contract during `safeTransfer`.
     */
    function onERC721Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes calldata data
    ) external returns (bytes4);

    /**
     * @notice Distributes rewards and transfers token to buyer, close sale order.
     * @param orderId Order id.
     */
    function realize(uint256 orderId) external payable;

    /**
     * @notice Cancels token sale order, transfers token back to seller.
     * @param orderId Order id.
     */
    function cancel(uint256 orderId) external;

    /**
     * @notice Returns order by orderId.
     * @param orderId Order id.
     * @return Order.
     */
    function order(uint256 orderId) external view returns (Order memory);
}
