// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {EIP712Domain} from "../utils/EIP712Domain.sol";
import {EIP712Signature} from "../utils/EIP712Signature.sol";
import {RoleSystem} from "../utils/role-system/RoleSystem.sol";
import {CurrencyManager} from "../utils/currency-manager/CurrencyManager.sol";
import {Roles} from "../utils/Roles.sol";
import {Authorization} from "../utils/Authorization.sol";
import {SafeERC20BulkTransfer} from "../utils/SafeERC20BulkTransfer.sol";
import {MarketStorage} from "./MarketStorage.sol";
import {IMarket} from "./IMarket.sol";
import {Order} from "./libraries/Order.sol";
import {OrderExecutionPermit} from "./libraries/OrderExecutionPermit.sol";

/**
 * @title Market
 *
 * @notice Upgradeable secondary market contract that facilitates peer-to-peer trading of NFTs
 *         through off-chain orders. It supports both sell-side (ask) and buy-side (bid) orders,
 *         which are authorized via EIP-712 signatures.
 */
contract Market is IMarket, EIP712Domain, RoleSystem, CurrencyManager, Authorization {
    using Order for Order.Type;
    using OrderExecutionPermit for OrderExecutionPermit.Type;

    /**
     * @notice Contract constructor.
     *
     * @param proxy Proxy address used for EIP-712 verifying contract.
     * @param main Address that will be set as {RoleSystem.MAIN}.
     */
    constructor(address proxy, address main) EIP712Domain(proxy, "Market", "1") RoleSystem(main) {}

    /**
     * @inheritdoc IMarket
     *
     * @dev Flow:
     *   1. Validates the order side, taker, currency, signatures, and time range.
     *   2. Invalidates the order to prevent replay attacks.
     *   3. Distributes the payment and fees.
     *   4. Transfers the token from the seller to the buyer.
     *   5. Emits {AskOrderExecuted}.
     */
    function executeAsk(
        Order.Type calldata order,
        OrderExecutionPermit.Type calldata permit,
        bytes calldata orderSignature,
        bytes calldata permitSignature
    ) external {
        if (order.side != Order.Side.Ask) {
            revert MarketInvalidOrderSide();
        }

        if (permit.orderHash != order.hash()) {
            revert MarketInvalidOrderHash();
        }

        if (order.makerFee >= order.price) {
            revert MarketInvalidAskSideFee();
        }

        if (permit.taker != msg.sender) {
            revert MarketUnauthorizedAccount();
        }

        if (!currencyAllowed(order.currency)) {
            revert MarketCurrencyInvalid();
        }

        address maker = order.maker;

        _requireAuthorizedOrder(permit.orderHash, maker, order.startTime, order.endTime, orderSignature);

        _requireAuthorizedAction(permit.hash(), permit.deadline, permitSignature);

        _invalidateOrder(maker, permit.orderHash);

        _distribute(
            IERC20(order.currency),
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
     * @inheritdoc IMarket
     *
     * @dev Flow:
     *   1. Validates the order side, taker, currency, signatures, and time range.
     *   2. Invalidates the order to prevent replay attacks.
     *   3. Distributes the payment and fees.
     *   4. Transfers the token from the seller to the buyer.
     *   5. Emits {BidOrderExecuted}.
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
            revert MarketInvalidOrderHash();
        }

        if (permit.takerFee >= order.price) {
            revert MarketInvalidAskSideFee();
        }

        if (permit.taker != msg.sender) {
            revert MarketUnauthorizedAccount();
        }

        if (!currencyAllowed(order.currency)) {
            revert MarketCurrencyInvalid();
        }

        address maker = order.maker;

        _requireAuthorizedOrder(permit.orderHash, maker, order.startTime, order.endTime, orderSignature);

        _requireAuthorizedAction(permit.hash(), permit.deadline, permitSignature);

        _invalidateOrder(maker, permit.orderHash);

        _distribute(
            IERC20(order.currency),
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
     * @inheritdoc IMarket
     */
    function invalidateOrder(address maker, bytes32 orderHash) external {
        if (msg.sender == maker || hasRole(Roles.ADMIN_ROLE, msg.sender)) {
            _invalidateOrder(maker, orderHash);

            emit OrderInvalidated(maker, orderHash);
        } else {
            revert MarketUnauthorizedAccount();
        }
    }

    /**
     * @inheritdoc IMarket
     */
    function orderInvalidated(address maker, bytes32 orderHash) external view returns (bool invalidated) {
        MarketStorage.Layout storage $ = MarketStorage.layout();

        invalidated = $.orderInvalidated[maker][orderHash];
    }

    /**
     * @notice Internal function to handle the distribution of funds for an order.
     *
     * @param currency The ERC-20 token used for the payment.
     * @param askSide The seller's address.
     * @param bidSide The buyer's address.
     * @param price The price of the order.
     * @param askSideFee The fee for the ask side.
     * @param bidSideFee The fee for the bid side.
     * @param participants The addresses of the participants in the revenue share.
     * @param rewards The corresponding rewards for each participant.
     */
    function _distribute(
        IERC20 currency,
        address askSide,
        address bidSide,
        uint256 price,
        uint256 askSideFee,
        uint256 bidSideFee,
        address[] calldata participants,
        uint256[] calldata rewards
    ) internal {
        SafeERC20.safeTransferFrom(currency, bidSide, address(this), price + bidSideFee);

        SafeERC20.safeTransfer(currency, askSide, price - askSideFee);

        SafeERC20.safeTransfer(currency, uniqueRoleOwner(Roles.FINANCIAL_ROLE), bidSideFee);

        SafeERC20BulkTransfer.safeTransfer(currency, askSideFee, participants, rewards);
    }

    /**
     * @notice Internal function to invalidate an order.
     *
     * @dev Reverts with {MarketOrderInvalidated} if the order is already invalidated.
     *
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
     *
     * @dev It checks the time validity of the order and recovers the signer's address from the
     *      signature to ensure it matches the `maker`.
     *
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

        address signer = EIP712Signature.recover(
            DOMAIN_SEPARATOR,
            orderHash,
            orderSignature //
        );

        if (maker != signer) {
            revert MarketUnauthorizedOrder();
        }
    }
}
