// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {Upgradeable} from "./utils/Upgradeable.sol";
import {BaseMarket} from "./utils/BaseMarket.sol";
import {MarketSigner} from "./utils/MarketSigner.sol";
import {IAuction} from "./interfaces/IAuction.sol";
import {IAuctionErrors} from "./interfaces/IAuctionErrors.sol";

/**
 * @title Auction
 *
 * @notice Auction contract provides logic for creating auction with ERC721 tokens.
 */
contract Auction is Upgradeable, BaseMarket, MarketSigner, IAuction, IAuctionErrors {
    /**
     * @dev Stores auction orders by order ID.
     */
    mapping(uint256 => Order) private _orders;

    /**
     * @param _token ERC721 token contract address, immutable.
     * @param _marketSigner Data signer address, immutable.
     */
    constructor(address _token, address _marketSigner) BaseMarket(_token) MarketSigner(_marketSigner, "Auction", "1") {}

    /**
     * @inheritdoc Upgradeable
     */
    function initialize() external override initializer {
        __BaseMarket_init();
        __MarketSigner_init();
    }

    /**
     * @inheritdoc IAuction
     *
     * @dev To invoke method order must have `Placed` status and auction must be ongoing,
     *   seller can't raise price for their own order.
     */
    function raise(uint256 orderId) external payable placedOrder(orderId) {
        if (_orders[orderId].deadline < block.timestamp) revert AuctionTimeIsUp(_orders[orderId].deadline);

        if (msg.sender == _orders[orderId].seller) revert AuctionInvalidBuyer(msg.sender);

        address prevBuyer = _orders[orderId].buyer;
        uint256 prevPrice = _orders[orderId].price;

        if (prevBuyer != address(0)) {
            if (msg.value < prevPrice + _orders[orderId].priceStep)
                revert AuctionNotEnoughEther(msg.value, prevPrice + _orders[orderId].priceStep);

            _orders[orderId].buyer = msg.sender;
            _orders[orderId].price = msg.value;

            emit Raised(orderId, _orders[orderId].tokenId, msg.sender, msg.value);

            _sendValue(prevBuyer, prevPrice);
        } else {
            if (msg.value < prevPrice) revert AuctionNotEnoughEther(msg.value, prevPrice);

            _orders[orderId].buyer = msg.sender;
            _orders[orderId].price = msg.value;

            emit Raised(orderId, _orders[orderId].tokenId, msg.sender, msg.value);
        }
    }

    /**
     * @inheritdoc IAuction
     *
     * @dev To invoke method order must have `Placed` status and auction must not be ongoing.
     */
    function end(uint256 orderId) external placedOrder(orderId) {
        if (_orders[orderId].deadline >= block.timestamp) revert AuctionStillGoing(_orders[orderId].deadline);

        _orders[orderId].status = OrderStatus.Ended;

        uint256 tokenId = _orders[orderId].tokenId;
        address buyer = _orders[orderId].buyer;
        address seller = _orders[orderId].seller;
        uint256 price = _orders[orderId].price;

        emit Ended(orderId, tokenId, buyer, seller, price);

        if (buyer != address(0)) {
            _transferToken(address(this), buyer, tokenId);

            _distributeReward(price, _orders[orderId].participants, _orders[orderId].shares);
        } else {
            _transferToken(address(this), seller, tokenId);
        }
    }

    /**
     * @inheritdoc IAuction
     */
    function order(uint256 orderId) external view returns (Order memory) {
        if (_orders[orderId].status == OrderStatus.NotExists) revert AuctionOrderNotExist(orderId);
        return _orders[orderId];
    }

    /**
     * @dev Places auction order.
     *
     * @param from Token owner.
     * @param tokenId Token for sale.
     * @param price Token price.
     * @param deadline Timestamp until which the auction continues.
     * @param priceStep Minimum price raise step.
     * @param sigDeadline Timestamp until which `signature` is valid.
     * @param participants Array with addresses between which reward will be distributed.
     * @param shares Array with rewards amounts,
     *   order of `shares` corresponds to order of `participants`,
     *   total shares must be equal to `price`.
     * @param sig [EIP712](https://eips.ethereum.org/EIPS/eip-712) signature.
     *   See `MarketSigner::ORDER_TYPE_HASH`.
     */
    function _place(
        address from,
        uint256 tokenId,
        uint256 price,
        uint256 deadline,
        uint256 priceStep,
        uint256 sigDeadline,
        address[] memory participants,
        uint256[] memory shares,
        bytes memory sig
    ) internal {
        if (deadline < block.timestamp) revert AuctionInvalidDeadline(deadline, block.timestamp);

        _validateSignature(from, tokenId, price, sigDeadline, participants, shares, sig);
        _validateShares(participants, shares);

        uint256 orderId = _useOrderId();

        _orders[orderId] = Order({
            seller: from,
            buyer: address(0),
            tokenId: tokenId,
            price: price,
            deadline: deadline,
            priceStep: priceStep,
            status: OrderStatus.Placed,
            participants: participants,
            shares: shares
        });

        emit Placed(orderId, tokenId, from, price, priceStep, deadline);
    }

    /**
     * @inheritdoc BaseMarket
     *
     * @dev Method overrides `BaseMarket::_onReceived.`
     *
     * @param data abi.encode(
     *     `price`,
     *     `deadline`,
     *     `priceStep`,
     *     `sigDeadline`,
     *     `participants`,
     *     `shares`,
     *     `sig`
     *   ).
     *   See `_place` method.
     */
    function _onReceived(address from, uint256 tokenId, bytes calldata data) internal override(BaseMarket) {
        (
            uint256 price,
            uint256 deadline,
            uint256 priceStep,
            uint256 sigDeadline,
            address[] memory participants,
            uint256[] memory shares,
            bytes memory sig
        ) = abi.decode(data, (uint256, uint256, uint256, uint256, address[], uint256[], bytes));

        _place(from, tokenId, price, deadline, priceStep, sigDeadline, participants, shares, sig);
    }

    /**
     * @inheritdoc BaseMarket
     *
     * @dev Method overrides `BaseMarket::_orderPlaced.`
     *
     * @param orderId Auction order ID.
     */
    function _orderPlaced(uint256 orderId) internal view override(BaseMarket) returns (bool) {
        return _orders[orderId].status == OrderStatus.Placed;
    }

    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     *   variables without shifting down storage in the inheritance chain.
     *   See <https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps>.
     */
    uint256[50] private __gap;
}
