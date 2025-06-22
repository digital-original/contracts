// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {EIP712Domain} from "../utils/EIP712Domain.sol";
import {EIP712Signature} from "../utils/EIP712Signature.sol";
import {RoleSystem} from "../utils/role-system/RoleSystem.sol";
import {CurrencyManager} from "../utils/currency-manager/CurrencyManager.sol";
import {Roles} from "../utils/Roles.sol";
import {Authorization} from "../utils/Authorization.sol";
import {Distribution} from "../utils/Distribution.sol";
import {Array} from "../utils/Array.sol";
import {IArtToken} from "../art-token/IArtToken.sol";
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

    IArtToken public immutable ART_TOKEN; // ArtToken contract address
    IERC20 public immutable USDC; // USDC contract address

    constructor(
        address proxy,
        address main,
        address artToken,
        address usdc
    ) EIP712Domain(proxy, "Market", "1") RoleSystem(main) {
        if (artToken == address(0)) revert MarketMisconfiguration(2);
        if (usdc == address(0)) revert MarketMisconfiguration(3);

        ART_TOKEN = IArtToken(artToken);
        USDC = IERC20(usdc);
    }

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
            maker, // userAsk
            msg.sender, // userBid
            order.price,
            order.makerShare, // userAskShare
            bidFee(order.price), // userBidFee
            permit.participants,
            permit.shares
        );

        ART_TOKEN.safeTransferFrom(
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
            msg.sender, // userAsk
            maker, // userBid
            order.price,
            0, // userAskShare, zero means remainingShare
            order.makerFee, // userBidFee
            permit.participants,
            permit.shares
        );

        ART_TOKEN.safeTransferFrom(
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

        invalidated = $.makerOrderNonce[maker][orderHash];
    }

    // prettier-ignore
    function bidFee(uint256 price) public pure returns (uint256 fee) {
        // price <= 100K USDC; fee = 5%
        if (price <= 100_000_000_000) fee = (price * 500) / 10_000;

        // price <= 500K USDC; fee = 4%
        else if (price <= 500_000_000_000) fee = (price * 400) / 10_000;

        // price <= 5M USDC; fee = 3%
        else if (price <= 5_000_000_000_000) fee = (price * 300) / 10_000;

        // price > 5M USDC; fee = 2%
        else fee = (price * 200) / 10_000;
    }

    function _chargePayment(
        address userAsk,
        address userBid,
        uint256 price,
        uint256 userAskShare,
        uint256 userBidFee,
        address[] calldata participants,
        uint256[] calldata shares
    ) internal {
        (address[] memory _participants, uint256[] memory _shares) = _prepareDistribution(
            userAsk,
            userAskShare,
            participants,
            shares
        );

        uint256 fee = _prepareBidFee(price, userBidFee);

        USDC.safeTransferFrom(userBid, address(this), price + fee);

        USDC.safeTransfer(uniqueRoleOwner(Roles.FINANCIAL_ROLE), fee);

        Distribution.safeDistribute(USDC, price, _participants, _shares);
    }

    function _invalidateOrder(address maker, bytes32 orderHash) internal {
        MarketStorage.Layout storage $ = MarketStorage.layout();

        if ($.makerOrderNonce[maker][orderHash]) {
            revert MarketOrderInvalidated(orderHash);
        }

        $.makerOrderNonce[maker][orderHash] = true;
    }

    /**
     * @notice This function is internal and is used to verify the validity of an order
     *         in the context of the current block timestamps.
     * @param startTime Start timestamp
     * @param endTime End timestamp
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

    function _prepareDistribution(
        address userAsk,
        uint256 userAskShare,
        address[] calldata participants,
        uint256[] calldata shares
    ) internal pure returns (address[] memory _participants, uint256[] memory _shares) {
        uint256 remaining = Distribution.remainingShare(shares);

        if (remaining < userAskShare) {
            revert MarketRemainingShareTooLow(remaining);
        }

        _participants = Array.push(participants, userAsk);
        _shares = Array.push(shares, remaining);
    }

    function _prepareBidFee(uint256 price, uint256 userBidFee) internal pure returns (uint256 fee) {
        fee = bidFee(price);

        if (userBidFee < fee) {
            revert MarketUserBidFeeTooLow();
        }
    }
}
