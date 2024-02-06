// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {EIP712Wrapper} from "./utils/EIP712Wrapper.sol";
import {TokenHolder} from "./utils/TokenHolder.sol";
import {OrderCounter} from "./utils/OrderCounter.sol";
import {DistributionLibrary} from "./library/DistributionLibrary.sol";
import {IMarket} from "./interfaces/IMarket.sol";

/**
 * @title Market
 *
 * @notice Market contract provides logic for selling and buying ERC721 tokens.
 */
contract Market is IMarket, TokenHolder, OrderCounter, EIP712Wrapper {
    // TODO: Do you need to remove seller?
    bytes32 public constant MARKET_PERMIT_TYPE_HASH =
        keccak256(
            "MarketPermit(address seller,uint256 tokenId,uint256 price,address[] participants,uint256[] shares,uint256 deadline)"
        );

    address public immutable MARKET_SIGNER;

    /**
     * @dev Stores orders by order ID.
     */
    mapping(uint256 => Order) private _orders;

    /**
     * @dev Throws if the order is not placed.
     */
    modifier placedOrder(uint256 orderId) {
        if (_orders[orderId].status != OrderStatus.Placed) revert MarketOrderNotPlaced(orderId);
        _;
    }

    /**
     * @param _token ERC721 token contract address, immutable.
     * @param marketSigner Data signer address, immutable.
     */
    constructor(address _token, address marketSigner) TokenHolder(_token) EIP712("Market", "1") {
        MARKET_SIGNER = marketSigner;
    }

    /**
     * @inheritdoc IMarket
     *
     * @dev To invoke method order must have `Placed` status,
     *   seller can't realize their own order.
     */
    function realize(uint256 orderId) external payable placedOrder(orderId) {
        address seller = _orders[orderId].seller;
        uint256 price = _orders[orderId].price;

        if (msg.sender == seller) revert MarketInvalidBuyer(msg.sender);

        if (msg.value != price) revert MarketInsufficientPayment(msg.value, price);

        uint256 tokenId = _orders[orderId].tokenId;

        _orders[orderId].status = OrderStatus.Realized;

        emit Realized(orderId, tokenId, msg.sender, seller, price);

        _transferToken(address(this), msg.sender, tokenId);

        DistributionLibrary.distribute(price, _orders[orderId].participants, _orders[orderId].shares);
    }

    /**
     * @inheritdoc IMarket
     *
     * @dev Only seller can invoke `cancel` for their own order,
     *   to invoke method order must have `Placed` status.
     */
    function cancel(uint256 orderId) external placedOrder(orderId) {
        if (msg.sender != _orders[orderId].seller) revert MarketUnauthorizedAccount(msg.sender);

        uint256 tokenId = _orders[orderId].tokenId;

        _orders[orderId].status = OrderStatus.Cancelled;

        emit Cancelled(orderId, tokenId, msg.sender);

        _transferToken(address(this), msg.sender, tokenId);
    }

    /**
     * @inheritdoc IMarket
     */
    function order(uint256 orderId) external view returns (Order memory) {
        if (_orders[orderId].status == OrderStatus.NotExists) revert MarketOrderNotExist(orderId);
        return _orders[orderId];
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

        DistributionLibrary.validateShares(participants, shares);

        uint256 orderId = _useOrderId();

        _orders[orderId] = Order({
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
     * @inheritdoc TokenHolder
     *
     * @dev Method overrides `TokenHolder::_onReceived.`
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
    function _onReceived(address, address from, uint256 tokenId, bytes calldata data) internal override(TokenHolder) {
        (
            uint256 price,
            uint256 deadline,
            address[] memory participants,
            uint256[] memory shares,
            bytes memory signature
        ) = abi.decode(data, (uint256, uint256, address[], uint256[], bytes));

        _place(from, tokenId, price, deadline, participants, shares, signature);
    }
}
