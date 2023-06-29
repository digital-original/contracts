// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import {BaseMarket} from "./utils/BaseMarket.sol";
import {MarketSigner} from "./utils/MarketSigner.sol";
import {IAuction} from "./interfaces/IAuction.sol";

/**
 * @title Auction
 *
 * @notice Auction contract provides logic for creating auction with ERC-721 tokens.
 * @notice Upgradeable Contract based on [OpenZeppelin](https://docs.openzeppelin.com/) library.
 */
contract Auction is Initializable, BaseMarket, MarketSigner, IAuction, IERC721Receiver {
    /**
     * @dev Stores auction orders by order id.
     */
    mapping(uint256 => Order) private _orders;

    /**
     * @param collection_ ERC-721 contract address, immutable.
     * @param marketSigner_ Data signer address, immutable.
     */
    constructor(
        address collection_,
        address marketSigner_
    ) BaseMarket(collection_) MarketSigner(marketSigner_, "Auction", "1") {}

    /**
     * @notice Initializes contract.
     *
     * @dev Method should be invoked on proxy contract via `delegatecall`.
     *   See <https://docs.openzeppelin.com/upgrades-plugins/1.x/writing-upgradeable#initializers>.
     */
    function initialize() external initializer {
        __BaseMarket_init();
        __MarketSigner_init();
    }

    /**
     * @inheritdoc IAuction
     *
     * @param data abi.encode(`price`, `endBlock`, `priceStep`, `expiredBlock`, `participants`, `shares`, `signature`).
     *   See `_place` method.
     */
    function onERC721Received(
        address,
        address from,
        uint256 tokenId,
        bytes calldata data
    ) external override(IAuction, IERC721Receiver) onlyCollection returns (bytes4) {
        (
            uint256 price,
            uint256 endBlock,
            uint256 priceStep,
            uint256 expiredBlock,
            address[] memory participants,
            uint256[] memory shares,
            bytes memory signature
        ) = abi.decode(data, (uint256, uint256, uint256, uint256, address[], uint256[], bytes));

        _place(from, tokenId, price, endBlock, priceStep, expiredBlock, participants, shares, signature);

        return IERC721Receiver.onERC721Received.selector;
    }

    /**
     * @inheritdoc IAuction
     *
     * @dev To invoke method order must have `Placed` status and auction must be ongoing,
     *   seller can't raise price for their own order.
     */
    function raise(uint256 orderId) external payable placedOrder(orderId) {
        // TODO: How should work a first raise, should first bid eq prevPrice + _orders[orderId].priceStep or initial price?
        require(_orders[orderId].endBlock >= block.number, "Auction: auction is ended");

        address seller = _orders[orderId].seller;

        require(msg.sender != seller, "Auction: seller can not be buyer");

        uint256 prevPrice = _orders[orderId].price;

        require(msg.value >= prevPrice + _orders[orderId].priceStep, "Auction: invalid ether amount");

        address prevBuyer = _orders[orderId].buyer;

        _orders[orderId].price = msg.value;
        _orders[orderId].buyer = msg.sender;

        emit Raised(orderId, _orders[orderId].tokenId, msg.sender, seller, msg.value);

        if (prevBuyer != address(0)) {
            _sendValue(prevBuyer, prevPrice);
        }
    }

    /**
     * @inheritdoc IAuction
     *
     * @dev To invoke method order must have `Placed` status and auction must not be ongoing,
     *   seller can't raise price in their own order.
     */
    function end(uint256 orderId) external placedOrder(orderId) {
        require(_orders[orderId].endBlock < block.number, "Auction: auction is still going");

        _orders[orderId].status = OrderStatus.Ended;

        uint256 tokenId = _orders[orderId].tokenId;
        address buyer = _orders[orderId].buyer;
        address seller = _orders[orderId].seller;
        uint256 price = _orders[orderId].price;

        emit Ended(orderId, tokenId, buyer, seller, price);

        if (buyer != address(0)) {
            _transferToken(address(this), buyer, tokenId);

            address[] memory participants = _orders[orderId].participants;
            uint256[] memory shares = _orders[orderId].shares;
            uint256 lastShareIndex = shares.length - 1;
            uint256 totalShares = _sumShares(shares);
            uint256 released;

            for (uint256 i = 0; i < lastShareIndex; i++) {
                uint256 value = (shares[i] * price) / totalShares;

                released += value;

                _sendValue(participants[i], value);
            }

            // calculates last share out of loop not to lose wei after division
            _sendValue(participants[lastShareIndex], price - released);
        } else {
            _transferToken(address(this), seller, tokenId);
        }
    }

    /**
     * @inheritdoc IAuction
     */
    function order(uint256 orderId) external view returns (Order memory) {
        require(_orders[orderId].status != OrderStatus.NotExists, "Auction: order does not exist");
        return _orders[orderId];
    }

    /**
     * @dev Places auction order.
     *
     * @param from Token owner.
     * @param tokenId Token for sale.
     * @param price Token price.
     * @param endBlock Block number until which the auction continues.
     * @param priceStep Minimum price raise step.
     * @param expiredBlock Block number until which `signature` is valid.
     * @param participants Array with addresses between which reward will be distributed.
     * @param shares Array with rewards amounts,
     *   order of `shares` corresponds to order of `participants`,
     *   total shares must be equal to `price`.
     * @param signature [EIP-712](https://eips.ethereum.org/EIPS/eip-712) signature.
     *   Signature must include `expiredBlock` and can include other data for validation.
     *   See `MarketSigner::ORDER_TYPEHASH`.
     */
    function _place(
        address from,
        uint256 tokenId,
        uint256 price,
        uint256 endBlock,
        uint256 priceStep,
        uint256 expiredBlock,
        address[] memory participants,
        uint256[] memory shares,
        bytes memory signature
    ) internal {
        // TODO: What happen if priceStep = 0?

        require(endBlock > block.number, "Auction: end block is less than current");

        _validateSignature(from, tokenId, price, expiredBlock, participants, shares, signature);
        _validatePrice(price, participants, shares);

        uint256 orderId = _orderId();

        _orders[orderId] = Order({
            seller: from,
            buyer: address(0),
            tokenId: tokenId,
            price: price,
            endBlock: endBlock,
            priceStep: priceStep,
            status: OrderStatus.Placed,
            participants: participants,
            shares: shares
        });

        emit Placed(orderId, tokenId, from, price);
    }

    /**
     * @inheritdoc BaseMarket
     *
     * @dev Method overrides `BaseMarket._orderPlaced.`
     *
     * @param orderId Auction order id.
     */
    function _orderPlaced(uint256 orderId) internal view override(BaseMarket) returns (bool) {
        return _orders[orderId].status == OrderStatus.Placed;
    }

    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     *   variables without shifting down storage in the inheritance chain.
     *   See <https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps>.
     */
    uint256[49] private __gap;
}
