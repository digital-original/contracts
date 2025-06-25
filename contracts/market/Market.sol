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
import {Distribution} from "../utils/Distribution.sol";
import {Array} from "../utils/Array.sol";
import {MarketStorage} from "./MarketStorage.sol";
import {IMarket} from "./IMarket.sol";
import {AskOrder} from "./libraries/AskOrder.sol";
import {BidOrder} from "./libraries/BidOrder.sol";
import {OrderExecutionPermit} from "./libraries/OrderExecutionPermit.sol";

/**
 * @title Market
 *
 * @notice Upgradeable secondary market contract that facilitates peer-to-peer trading of NFTs
 *         through off-chain orders. It supports both sell-side (ask) and buy-side (bid) orders,
 *         which are authorized via EIP-712 signatures.
 */
contract Market is IMarket, EIP712Domain, RoleSystem, CurrencyManager, Authorization {
    using SafeERC20 for IERC20;
    using AskOrder for AskOrder.Type;
    using BidOrder for BidOrder.Type;
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
     *   1. Validates the order currency, share distribution, signatures, and time range.
     *   2. Invalidates the order to prevent replay attacks.
     *   3. Transfers the token from the seller to the buyer.
     *   4. Transfers the payment from the buyer, splits the revenue, and sends the fee to the
     *      treasury.
     *   5. Emits {AskOrderExecuted}.
     */
    function executeAsk(
        AskOrder.Type calldata order,
        OrderExecutionPermit.Type calldata permit,
        bytes calldata orderSignature,
        bytes calldata permitSignature
    ) external {
        if (!currencyAllowed(order.currency)) {
            revert MarketCurrencyInvalid();
        }

        if (order.makerShare > Distribution.remainingShare(permit.shares)) {
            revert MarketRemainingShareTooLow();
        }

        bytes32 orderHash = order.hash();
        address maker = order.maker;

        _requireAuthorizedOrder(
            orderHash,
            maker,
            order.startTime,
            order.endTime,
            orderSignature //
        );

        _requireAuthorizedAction(
            permit.hash(orderHash),
            permit.deadline,
            permitSignature //
        );

        _invalidateOrder(maker, orderHash);

        _chargePayment(
            IERC20(order.currency),
            maker, // userAsk
            msg.sender, // userBid
            order.price,
            permit.participants,
            permit.shares
        );

        IERC721(order.collection).safeTransferFrom(
            maker, // from userAsk
            msg.sender, // to userBid
            order.tokenId
        );

        emit AskOrderExecuted(
            orderHash,
            order.collection,
            order.currency,
            maker,
            msg.sender,
            order.price,
            order.tokenId
        );
    }

    /**
     * @inheritdoc IMarket
     *
     * @dev Flow:
     *   1. Validates the order currency, fee, signatures, and time range.
     *   2. Invalidates the order to prevent replay attacks.
     *   3. Transfers the token from the seller to the buyer.
     *   4. Transfers the payment from the buyer, splits the revenue, and sends the fee to the
     *      treasury.
     *   5. Emits {BidOrderExecuted}.
     */
    function executeBid(
        BidOrder.Type calldata order,
        OrderExecutionPermit.Type calldata permit,
        bytes calldata orderSignature,
        bytes calldata permitSignature
    ) external {
        if (!currencyAllowed(order.currency)) {
            revert MarketCurrencyInvalid();
        }

        if (order.makerFee < bidFee(order.price)) {
            revert MarketBidFeeTooHigh();
        }

        bytes32 orderHash = order.hash();
        address maker = order.maker;

        _requireAuthorizedOrder(
            orderHash,
            maker,
            order.startTime,
            order.endTime,
            orderSignature //
        );

        _requireAuthorizedAction(
            permit.hash(orderHash),
            permit.deadline,
            permitSignature //
        );

        _invalidateOrder(maker, orderHash);

        _chargePayment(
            IERC20(order.currency),
            msg.sender, // userAsk
            maker, // userBid
            order.price,
            permit.participants,
            permit.shares
        );

        IERC721(order.collection).safeTransferFrom(
            msg.sender, // from userAsk
            order.maker, // to userBid
            order.tokenId
        );

        emit BidOrderExecuted(
            orderHash,
            order.collection,
            order.currency,
            maker,
            msg.sender,
            order.price,
            order.tokenId
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
     * @inheritdoc IMarket
     *
     * @dev Currently, the fee is always 0, but this function is kept for future use.
     */
    function bidFee(uint256 /* price */) public pure returns (uint256 fee) {
        fee = 0;
    }

    /**
     * @notice Internal function to handle payment transfers for an order.
     *
     * @dev It transfers the `price` and `fee` from the buyer, sends the `fee` to the treasury,
     *      and distributes the `price` among the seller and other participants.
     *
     * @param currency The ERC-20 token used for the payment.
     * @param userAsk The seller's address.
     * @param userBid The buyer's address.
     * @param price The price of the order.
     * @param participants An array of addresses for revenue sharing.
     * @param shares An array of shares for each participant.
     */
    function _chargePayment(
        IERC20 currency,
        address userAsk,
        address userBid,
        uint256 price,
        address[] calldata participants,
        uint256[] calldata shares
    ) internal {
        uint256 fee = bidFee(price);

        currency.safeTransferFrom(userBid, address(this), price + fee);
        currency.safeTransfer(uniqueRoleOwner(Roles.FINANCIAL_ROLE), fee);

        address[] memory _participants = Array.push(participants, userAsk);
        uint256[] memory _shares = Array.push(shares, Distribution.remainingShare(shares));

        Distribution.safeDistribute(currency, price, _participants, _shares);
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
