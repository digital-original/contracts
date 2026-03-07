// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.20;

import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {ETHER} from "../utils/Constants.sol";
import {EIP712Domain} from "../utils/EIP712Domain.sol";
import {EIP712Signature} from "../utils/EIP712Signature.sol";
import {RoleSystem} from "../utils/role-system/RoleSystem.sol";
import {CurrencyManager} from "../utils/currency-manager/CurrencyManager.sol";
import {CurrencyTransfers} from "../utils/CurrencyTransfers.sol";
import {Roles} from "../utils/Roles.sol";
import {Authorization} from "../utils/Authorization.sol";
import {MarketStorage} from "./MarketStorage.sol";
import {IMarket} from "./IMarket.sol";
import {Order} from "./libraries/Order.sol";
import {OrderExecutionPermit} from "./libraries/OrderExecutionPermit.sol";

/**
 * @title Market
 * @notice Upgradeable secondary market contract that facilitates peer-to-peer trading of NFTs
 *         through off-chain orders. It supports both sell-side (ask) and buy-side (bid) orders,
 *         which are authorized via EIP-712 signatures.
 */
contract Market is IMarket, EIP712Domain, RoleSystem, CurrencyManager, Authorization, CurrencyTransfers {
    using Order for Order.Type;
    using OrderExecutionPermit for OrderExecutionPermit.Type;

    /**
     * @notice Initializes the implementation with the given immutable parameters.
     * @param proxy Proxy address used for EIP-712 verifying contract.
     * @param main Address that will be set as {RoleSystem.MAIN}.
     * @param wrappedEther Address of the Wrapped Ether contract.
     */
    constructor(
        address proxy,
        address main,
        address wrappedEther
    ) EIP712Domain(proxy, "Market", "1") RoleSystem(main) CurrencyTransfers(wrappedEther) {}

    /**
     * @notice Executes a sell-side order (ask).
     * @dev The `order` must be signed by the `maker` (seller), and the `permit` must be signed by
     *      the market signer. The `msg.sender` is the `taker` (buyer).
     *      `maker` is Ask side, `taker` is Bid side.
     *      Flow:
     *        1. Validates the order side, taker, currency, signatures, and time range.
     *        2. Invalidates the order to prevent replay attacks.
     *        3. Distributes the payment and fees.
     *        4. Transfers the token from the seller to the buyer.
     *        5. Emits {AskOrderExecuted}.
     * @param order The ask order to execute. See {Order.Type}.
     * @param permit The execution permit, containing revenue-sharing information. See {OrderExecutionPermit.Type}.
     * @param orderSignature The EIP-712 signature of the `order`, signed by the `maker`.
     * @param permitSignature The EIP-712 signature of the `permit`, signed by the market signer.
     */
    function executeAsk(
        Order.Type calldata order,
        OrderExecutionPermit.Type calldata permit,
        bytes calldata orderSignature,
        bytes calldata permitSignature
    ) external payable {
        if (order.side != Order.Side.Ask) {
            revert MarketInvalidOrderSide();
        }

        if (permit.orderHash != order.hash()) {
            revert MarketOrderHashMismatch();
        }

        if (order.price == 0) {
            revert MarketZeroOrderPrice();
        }

        if (order.makerFee >= order.price) {
            // maker is Ask side
            revert MarketInvalidAskSideFee();
        }

        if (permit.taker != msg.sender) {
            revert MarketUnauthorizedAccount();
        }

        if (!_currencyAllowed(order.currency)) {
            revert MarketUnsupportedCurrency();
        }

        address maker = order.maker;

        _requireAuthorizedOrder(permit.orderHash, maker, order.startTime, order.endTime, orderSignature);

        _requireAuthorizedAction(permit.hash(), permit.deadline, permitSignature);

        _invalidateOrder(maker, permit.orderHash);

        _distribute(
            order.currency,
            maker, // askSide - maker
            msg.sender, // bidSide - taker
            order.price,
            order.makerFee, // askSideFee
            permit.takerFee, // bidSideFee
            permit.participants,
            permit.rewards
        );

        IERC721(order.collection).safeTransferFrom(
            maker, // from askSide - maker
            msg.sender, // to bidSide - taker
            order.tokenId
        );

        emit AskOrderExecuted(
            permit.orderHash,
            order.collection,
            order.currency,
            maker,
            msg.sender,
            order.tokenId,
            order.price
        );
    }

    /**
     * @notice Executes a buy-side order (bid).
     * @dev The `order` must be signed by the `maker` (buyer), and the `permit` must be signed by
     *      the market signer. The `msg.sender` is the `taker` (seller).
     *      `maker` is Bid side, `taker` is Ask side.
     *      Flow:
     *        1. Validates the order side, taker, currency, signatures, and time range.
     *        2. Invalidates the order to prevent replay attacks.
     *        3. Distributes the payment and fees.
     *        4. Transfers the token from the seller to the buyer.
     *        5. Emits {BidOrderExecuted}.
     * @param order The bid order to execute. See {Order.Type}.
     * @param permit The execution permit, containing revenue-sharing information. See {OrderExecutionPermit.Type}.
     * @param orderSignature The EIP-712 signature of the `order`, signed by the `maker`.
     * @param permitSignature The EIP-712 signature of the `permit`, signed by the market signer.
     */
    function executeBid(
        Order.Type calldata order,
        OrderExecutionPermit.Type calldata permit,
        bytes calldata orderSignature,
        bytes calldata permitSignature
    ) external {
        if (order.side != Order.Side.Bid) {
            revert MarketInvalidOrderSide();
        }

        if (permit.orderHash != order.hash()) {
            revert MarketOrderHashMismatch();
        }

        if (order.price == 0) {
            revert MarketZeroOrderPrice();
        }

        if (permit.takerFee >= order.price) {
            // taker is Ask side
            revert MarketInvalidAskSideFee();
        }

        if (permit.taker != msg.sender) {
            revert MarketUnauthorizedAccount();
        }

        if (!_currencyAllowed(order.currency) || order.currency == ETHER) {
            revert MarketUnsupportedCurrency();
        }

        address maker = order.maker;

        _requireAuthorizedOrder(permit.orderHash, maker, order.startTime, order.endTime, orderSignature);

        _requireAuthorizedAction(permit.hash(), permit.deadline, permitSignature);

        _invalidateOrder(maker, permit.orderHash);

        _distribute(
            order.currency,
            msg.sender, // askSide - taker
            maker, // bidSide - maker
            order.price,
            permit.takerFee, // askSideFee
            order.makerFee, // bidSideFee
            permit.participants,
            permit.rewards
        );

        IERC721(order.collection).safeTransferFrom(
            msg.sender, // from askSide - taker
            maker, // to bidSide - maker
            order.tokenId
        );

        emit BidOrderExecuted(
            permit.orderHash,
            order.collection,
            order.currency,
            maker,
            msg.sender,
            order.tokenId,
            order.price
        );
    }

    /**
     * @notice Invalidates an order, preventing its future execution.
     * @dev Can be called by the `maker` of the order or a market admin.
     * @param maker Address of the order's maker.
     * @param orderHash The hash of the order to invalidate.
     */
    function invalidateOrder(address maker, bytes32 orderHash) external {
        if (msg.sender == maker || _hasRole(Roles.ADMIN_ROLE, msg.sender)) {
            _invalidateOrder(maker, orderHash);

            emit OrderInvalidated(maker, orderHash);
        } else {
            revert MarketUnauthorizedAccount();
        }
    }

    /**
     * @notice Checks if an order has been invalidated.
     * @param maker Address of the order's maker.
     * @param orderHash The hash of the order to check.
     * @return invalidated True if the order has been invalidated.
     */
    function orderInvalidated(address maker, bytes32 orderHash) external view returns (bool invalidated) {
        MarketStorage.Layout storage $ = MarketStorage.layout();

        invalidated = $.orderInvalidated[maker][orderHash];
    }

    /**
     * @notice Internal function to handle the distribution of funds for an order.
     * @param currency The currency token used for the payment.
     * @param askSide The seller's address.
     * @param bidSide The buyer's address.
     * @param price The price of the order.
     * @param askSideFee The fee for the ask side.
     * @param bidSideFee The fee for the bid side.
     * @param participants The addresses of the participants in the revenue share.
     * @param rewards The corresponding rewards for each participant.
     */
    function _distribute(
        address currency,
        address askSide,
        address bidSide,
        uint256 price,
        uint256 askSideFee,
        uint256 bidSideFee,
        address[] calldata participants,
        uint256[] calldata rewards
    ) internal {
        _receiveCurrency(currency, bidSide, price + bidSideFee);

        _sendCurrency(currency, askSide, price - askSideFee);

        _sendCurrency(currency, _uniqueRoleOwner(Roles.FINANCIAL_ROLE), bidSideFee);

        _sendCurrencyBatch(currency, askSideFee, participants, rewards);
    }

    /**
     * @notice Internal function to invalidate an order.
     * @dev Reverts if the order is already invalidated.
     * @param maker The address of the order's maker.
     * @param orderHash The hash of the order to invalidate.
     */
    function _invalidateOrder(address maker, bytes32 orderHash) internal {
        MarketStorage.Layout storage $ = MarketStorage.layout();

        if ($.orderInvalidated[maker][orderHash]) {
            revert MarketOrderInvalidated(orderHash);
        }

        $.orderInvalidated[maker][orderHash] = true;
    }

    /**
     * @notice Internal function to verify an order's authorization.
     * @dev It checks the time validity of the order and recovers the signer's address from the
     *      signature to ensure it matches the `maker`.
     * @param orderHash The hash of the order.
     * @param maker The address of the order's maker.
     * @param startTime The start time of the order's validity.
     * @param endTime The end time of the order's validity.
     * @param orderSignature The EIP-712 signature of the order.
     */
    function _requireAuthorizedOrder(
        bytes32 orderHash,
        address maker,
        uint256 startTime,
        uint256 endTime,
        bytes calldata orderSignature
    ) internal view {
        if (startTime > block.timestamp || endTime < block.timestamp) {
            revert MarketOrderOutsideOfTimeRange();
        }

        address signer = EIP712Signature.recover(DOMAIN_SEPARATOR, orderHash, orderSignature);

        if (maker != signer) {
            revert MarketInvalidOrderSignature();
        }
    }
}
