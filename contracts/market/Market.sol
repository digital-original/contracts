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

contract Market is IMarket, EIP712Domain, RoleSystem, CurrencyManager, Authorization {
    using SafeERC20 for IERC20;
    using AskOrder for AskOrder.Type;
    using BidOrder for BidOrder.Type;
    using OrderExecutionPermit for OrderExecutionPermit.Type;

    constructor(address proxy, address main) EIP712Domain(proxy, "Market", "1") RoleSystem(main) {}

    /**
     * @dev Maker creates ASK order, Taker executes ASK order,
     *   Maker is ASK user, Taker is BID user
     *   Maker receives ERC20, Taker receives ERC721
     *   BID user pays fee
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

        emit AskOrderExecuted(orderHash, maker, msg.sender, order.price, order.tokenId);
    }

    /**
     * @dev Maker creates BID order, Taker executes BID order,
     *   Maker is BID user, Taker is ASK user
     *   Maker receives ERC721, Taker receives ERC20
     *   BID user pays fee
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
            revert MarketUserBidFeeTooLow();
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

        emit BidOrderExecuted(orderHash, maker, msg.sender, order.price, order.tokenId);
    }

    function invalidateOrder(address maker, bytes32 orderHash) external {
        if (msg.sender == maker || hasRole(Roles.ADMIN_ROLE, msg.sender)) {
            _invalidateOrder(maker, orderHash);

            emit OrderInvalidated(maker, orderHash);
        } else {
            revert MarketUnauthorizedAccount();
        }
    }

    function orderInvalidated(address maker, bytes32 orderHash) external view returns (bool invalidated) {
        MarketStorage.Layout storage $ = MarketStorage.layout();

        invalidated = $.orderInvalidated[maker][orderHash];
    }

    function bidFee(uint256 /* price */) public pure returns (uint256 fee) {
        // TODO: implement fee calculation or explain why it's not implemented
        fee = 0;
    }

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

    function _invalidateOrder(address maker, bytes32 orderHash) internal {
        MarketStorage.Layout storage $ = MarketStorage.layout();

        if ($.orderInvalidated[maker][orderHash]) {
            revert MarketOrderInvalidated(orderHash);
        }

        $.orderInvalidated[maker][orderHash] = true;
    }

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
