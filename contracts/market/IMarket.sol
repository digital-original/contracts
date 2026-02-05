// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.20;

import {Order} from "./libraries/Order.sol";
import {OrderExecutionPermit} from "./libraries/OrderExecutionPermit.sol";

/**
 * @title IMarket
 *
 * @notice Interface for the protocol's secondary market module. It allows users to trade NFTs
 *         through off-chain orders (asks and bids) that are executed on-chain.
 */
interface IMarket {
    /**
     * @notice Emitted when a sell-side order (ask) is executed.
     *
     * @param orderHash The hash of the executed ask order.
     * @param collection Address of the ERC-721 collection contract.
     * @param currency Address of the settlement currency (ERC-20).
     * @param maker Address of the seller.
     * @param taker Address of the buyer.
     * @param price The price at which the token was sold.
     * @param tokenId The identifier of the token that was sold.
     */
    event AskOrderExecuted(
        bytes32 orderHash,
        address collection,
        address currency,
        address maker,
        address taker,
        uint256 tokenId,
        uint256 price
    );

    /**
     * @notice Emitted when a buy-side order (bid) is executed.
     *
     * @param orderHash The hash of the executed bid order.
     * @param collection Address of the ERC-721 collection contract.
     * @param currency Address of the settlement currency (ERC-20).
     * @param maker Address of the buyer.
     * @param taker Address of the seller.
     * @param price The price at which the token was bought.
     * @param tokenId The identifier of the token that was bought.
     */
    event BidOrderExecuted(
        bytes32 orderHash,
        address collection,
        address currency,
        address maker,
        address taker,
        uint256 tokenId,
        uint256 price
    );

    /**
     * @notice Emitted when an order is invalidated by its maker or a market admin.
     *
     * @param maker Address of the order's maker.
     * @param orderHash The hash of the invalidated order.
     */
    event OrderInvalidated(address maker, bytes32 orderHash);

    /**
     * @notice Executes a sell-side order (ask).
     *
     * @dev The `order` must be signed by the `maker` (seller), and the `permit` must be signed by
     *      the market signer. The `msg.sender` is the `taker` (buyer).
     *
     * @param order The ask order to execute. See {Order.Type}.
     * @param permit The execution permit, containing revenue-sharing information. See
     *               {OrderExecutionPermit.Type}.
     * @param orderSignature The EIP-712 signature of the `order`, signed by the `maker`.
     * @param permitSignature The EIP-712 signature of the `permit`, signed by the market signer.
     */
    function executeAsk(
        Order.Type calldata order,
        OrderExecutionPermit.Type calldata permit,
        bytes calldata orderSignature,
        bytes calldata permitSignature
    ) external payable;

    /**
     * @notice Executes a buy-side order (bid).
     *
     * @dev The `order` must be signed by the `maker` (buyer), and the `permit` must be signed by
     *      the market signer. The `msg.sender` is the `taker` (seller).
     *
     * @param order The bid order to execute. See {Order.Type}.
     * @param permit The execution permit, containing revenue-sharing information. See
     *               {OrderExecutionPermit.Type}.
     * @param orderSignature The EIP-712 signature of the `order`, signed by the `maker`.
     * @param permitSignature The EIP-712 signature of the `permit`, signed by the market signer.
     */
    function executeBid(
        Order.Type calldata order,
        OrderExecutionPermit.Type calldata permit,
        bytes calldata orderSignature,
        bytes calldata permitSignature
    ) external;

    /**
     * @notice Invalidates an order, preventing its future execution.
     *
     * @dev Can be called by the `maker` of the order or a market admin.
     *
     * @param maker Address of the order's maker.
     * @param orderHash The hash of the order to invalidate.
     */
    function invalidateOrder(address maker, bytes32 orderHash) external;

    /**
     * @notice Checks if an order has been invalidated.
     *
     * @param maker Address of the order's maker.
     * @param orderHash The hash of the order to check.
     *
     * @return invalidated True if the order has been invalidated, false otherwise.
     */
    function orderInvalidated(address maker, bytes32 orderHash) external view returns (bool invalidated);

    /// @dev Thrown when an order signature is not from the specified `maker`.
    error MarketUnauthorizedOrder();

    /// @dev Thrown when an order is executed with an invalid side.
    error MarketInvalidOrderSide();

    /// @dev Thrown when an order hash is invalid.
    error MarketInvalidOrderHash();

    /// @dev Thrown when an action is attempted by an unauthorized account.
    error MarketUnauthorizedAccount();

    /// @dev Thrown when an order is executed outside of its `startTime` and `endTime`.
    error MarketOrderOutsideOfTimeRange();

    /// @dev Thrown when the specified `currency` is not supported.
    error MarketCurrencyInvalid();

    /// @dev Thrown when an attempt is made to execute an invalidated order.
    error MarketOrderInvalidated(bytes32 orderHash);

    /// @dev Thrown when an ask side fee is invalid.
    error MarketInvalidAskSideFee();

    /// @dev Thrown when a constructor argument at `argIndex` is invalid.
    error MarketMisconfiguration(uint256 argIndex);
}
