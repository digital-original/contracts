// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {EIP712} from "../utils/EIP712.sol";
import {Distribution} from "../utils/Distribution.sol";
import {ArtTokenHolder} from "../art-token/ArtTokenHolder.sol";
import {MarketStorage} from "./MarketStorage.sol";
import {IMarket} from "./IMarket.sol";

/**
 * @title Market
 *
 * @notice Market contract provides logic for selling and buying ERC721 tokens.
 */
contract Market is IMarket, ArtTokenHolder, EIP712 {
    bytes32 public constant MARKET_PERMIT_TYPE_HASH =
        // prettier-ignore
        keccak256(
            "MarketPermit("
                "address seller,"
                "uint256 tokenId,"
                "uint256 price,"
                "address[] participants,"
                "uint256[] shares,"
                "uint256 deadline"
            ")"
        );

    address public immutable MARKET_SIGNER;

    /**
     * @dev Throws if the order is not placed.
     */
    modifier placedOrder(uint256 orderId) {
        MarketStorage.Layout storage $ = MarketStorage.layout();

        if ($.orders[orderId].status != OrderStatus.Placed) {
            revert MarketOrderNotPlaced(orderId);
        }

        _;
    }

    /**
     * @param _token ERC721 token contract address, immutable.
     * @param marketSigner Data signer address, immutable.
     */
    constructor(address _token, address marketSigner) ArtTokenHolder(_token) EIP712("Market", "1") {
        MARKET_SIGNER = marketSigner;
    }

    /**
     * @inheritdoc IMarket
     *
     * @dev To invoke method order must have `Placed` status,
     *   seller can't realize their own order.
     */
    function realize(uint256 orderId) external payable placedOrder(orderId) {
        MarketStorage.Layout storage $ = MarketStorage.layout();

        address seller = $.orders[orderId].seller;
        uint256 price = $.orders[orderId].price;

        if (msg.sender == seller) {
            revert MarketInvalidBuyer(msg.sender);
        }

        if (msg.value != price) {
            revert MarketInsufficientPayment(msg.value, price);
        }

        uint256 tokenId = $.orders[orderId].tokenId;

        $.orders[orderId].status = OrderStatus.Realized;

        emit Realized(orderId, tokenId, msg.sender, seller, price);

        _transferToken(msg.sender, tokenId);

        Distribution.distribute(price, $.orders[orderId].participants, $.orders[orderId].shares);
    }

    /**
     * @inheritdoc IMarket
     *
     * @dev Only seller can invoke `cancel` for their own order,
     *   to invoke method order must have `Placed` status.
     */
    function cancel(uint256 orderId) external placedOrder(orderId) {
        MarketStorage.Layout storage $ = MarketStorage.layout();

        if (msg.sender != $.orders[orderId].seller) {
            revert MarketUnauthorizedAccount(msg.sender);
        }

        uint256 tokenId = $.orders[orderId].tokenId;

        $.orders[orderId].status = OrderStatus.Cancelled;

        emit Cancelled(orderId, tokenId, msg.sender);

        _transferToken(msg.sender, tokenId);
    }

    function ordersCount() external view returns (uint256 count) {
        count = MarketStorage.layout().ordersCount;
    }

    /**
     * @inheritdoc IMarket
     */
    function order(uint256 orderId) external view returns (Order memory) {
        MarketStorage.Layout storage $ = MarketStorage.layout();

        if ($.orders[orderId].status == OrderStatus.NotExists) {
            revert MarketOrderNotExist(orderId);
        }

        return $.orders[orderId];
    }

    // /**
    //  * @dev Places token sale order.
    //  *
    //  * @param from Token owner.
    //  * @param tokenId Token for sale.
    //  * @param price Token price.
    //  * @param deadline Timestamp until which `signature` is valid.
    //  * @param participants Array with addresses between which reward will be distributed.
    //  * @param shares Array with rewards amounts,
    //  *   order of `shares` corresponds to order of `participants`,
    //  *   total shares must be equal to `price`.
    //  * @param signature [EIP712](https://eips.ethereum.org/EIPS/eip-712) signature.
    //  *   See `MarketSigner::ORDER_TYPE_HASH`.
    //  */ TODO_DOC
    function _place(
        address from,
        uint256 tokenId,
        uint256 price,
        uint256 deadline,
        address[] memory participants,
        uint256[] memory shares,
        bytes memory signature
    ) internal {
        bytes32 structHash = keccak256(
            abi.encode(
                MARKET_PERMIT_TYPE_HASH,
                from,
                tokenId,
                price,
                keccak256(abi.encodePacked(participants)),
                keccak256(abi.encodePacked(shares)),
                deadline
            )
        );

        _validateSignature(MARKET_SIGNER, structHash, deadline, signature);

        Distribution.validateShares(participants, shares);

        uint256 orderId = _useOrderId();

        MarketStorage.Layout storage $ = MarketStorage.layout();

        $.orders[orderId] = Order({
            seller: from,
            tokenId: tokenId,
            price: price,
            status: OrderStatus.Placed,
            participants: participants,
            shares: shares
        });

        emit Placed(orderId, tokenId, from, price);
    }

    /**
     * @inheritdoc ArtTokenHolder
     *
     * @dev Method overrides `ArtTokenHolder::_onReceived.`
     *
     * @param data abi.encode(
     *     `price`,
     *     `deadline`,
     *     `participants`,
     *     `shares`,
     *     `signature`
     *   ).
     *   See `_place` method.
     */
    function _onReceived(
        address,
        address from,
        uint256 tokenId,
        bytes calldata data
    ) internal override(ArtTokenHolder) {
        (
            uint256 price,
            uint256 deadline,
            address[] memory participants,
            uint256[] memory shares,
            bytes memory signature
        ) = abi.decode(data, (uint256, uint256, address[], uint256[], bytes));

        _place(from, tokenId, price, deadline, participants, shares, signature);
    }

    function _useOrderId() private returns (uint256) {
        MarketStorage.Layout storage $ = MarketStorage.layout();

        return $.ordersCount++;
    }
}
