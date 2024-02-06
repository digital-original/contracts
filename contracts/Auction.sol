// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {Address} from "@openzeppelin/contracts/utils/Address.sol";
import {EIP712Wrapper} from "./utils/EIP712Wrapper.sol";
import {TokenHolder} from "./utils/TokenHolder.sol";
import {OrderCounter} from "./utils/OrderCounter.sol";
import {DistributionLibrary} from "./library/DistributionLibrary.sol";
import {IAuction} from "./interfaces/IAuction.sol";

/**
 * @title Auction
 *
 * @notice Auction contract provides logic for creating auction with ERC721 tokens.
 */
contract Auction is IAuction, TokenHolder, OrderCounter, EIP712Wrapper {
    bytes32 public constant AUCTION_PERMIT_TYPE_HASH =
        keccak256(
            "AuctionPermit(address seller,uint256 tokenId,uint256 price,uint256 priceStep,uint256 endTime,address[] participants,uint256[] shares,uint256 deadline)"
        );

    address public immutable AUCTION_SIGNER;

    /**
     * @dev Stores auction orders by order ID.
     */
    mapping(uint256 => Order) private _orders;

    /**
     * @dev Throws if the order is not placed.
     */
    modifier placedOrder(uint256 orderId) {
        if (_orders[orderId].status != OrderStatus.Placed) revert AuctionOrderNotPlaced(orderId);
        _;
    }

    /**
     * @param _token ERC721 token contract address, immutable.
     * @param auctionSigner Data signer address, immutable.
     */
    constructor(address _token, address auctionSigner) TokenHolder(_token) EIP712("Auction", "1") {
        AUCTION_SIGNER = auctionSigner;
    }

    /**
     * @inheritdoc IAuction
     *
     * @dev To invoke method order must have `Placed` status and auction must be ongoing,
     *   seller can't raise price for their own order.
     */
    function raise(uint256 orderId) external payable placedOrder(orderId) {
        if (_orders[orderId].endTime < block.timestamp) revert AuctionTimeIsUp(_orders[orderId].endTime);

        if (msg.sender == _orders[orderId].seller) revert AuctionInvalidBuyer(msg.sender);

        address prevBuyer = _orders[orderId].buyer;
        uint256 prevPrice = _orders[orderId].price;

        if (prevBuyer == address(0)) {
            if (msg.value < prevPrice) revert AuctionNotEnoughEther(msg.value, prevPrice);

            _orders[orderId].buyer = msg.sender;
            _orders[orderId].price = msg.value;

            emit Raised(orderId, _orders[orderId].tokenId, msg.sender, msg.value);
        } else {
            if (msg.value < prevPrice + _orders[orderId].priceStep)
                revert AuctionNotEnoughEther(msg.value, prevPrice + _orders[orderId].priceStep);

            _orders[orderId].buyer = msg.sender;
            _orders[orderId].price = msg.value;

            emit Raised(orderId, _orders[orderId].tokenId, msg.sender, msg.value);

            Address.sendValue(payable(prevBuyer), prevPrice);
        }
    }

    /**
     * @inheritdoc IAuction
     *
     * @dev To invoke method order must have `Placed` status and auction must not be ongoing.
     */
    function end(uint256 orderId) external placedOrder(orderId) {
        if (_orders[orderId].endTime >= block.timestamp) revert AuctionStillGoing(_orders[orderId].endTime);

        _orders[orderId].status = OrderStatus.Ended;

        uint256 tokenId = _orders[orderId].tokenId;
        address buyer = _orders[orderId].buyer;
        address seller = _orders[orderId].seller;
        uint256 price = _orders[orderId].price;

        emit Ended(orderId, tokenId, buyer, seller, price);

        if (buyer != address(0)) {
            _transferToken(address(this), buyer, tokenId);

            DistributionLibrary.distribute(price, _orders[orderId].participants, _orders[orderId].shares);
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
     * @param endTime Timestamp until which the auction continues.
     * @param priceStep Minimum price raise step.
     * @param deadline Timestamp until which `signature` is valid.
     * @param participants Array with addresses between which reward will be distributed.
     * @param shares Array with rewards amounts,
     *   order of `shares` corresponds to order of `participants`,
     *   total shares must be equal to `price`.
     * @param signature [EIP712](https://eips.ethereum.org/EIPS/eip-712) signature.
     *   See `MarketSigner::ORDER_TYPE_HASH`.
     */
    function _place(
        address from,
        uint256 tokenId,
        uint256 price,
        uint256 priceStep,
        uint256 endTime,
        uint256 deadline,
        address[] memory participants,
        uint256[] memory shares,
        bytes memory signature
    ) internal {
        if (endTime < block.timestamp) revert AuctionInvalidEndTime(endTime, block.timestamp);

        bytes32 structHash = keccak256(
            abi.encode(
                AUCTION_PERMIT_TYPE_HASH,
                from,
                tokenId,
                price,
                priceStep,
                endTime,
                keccak256(abi.encodePacked(participants)),
                keccak256(abi.encodePacked(shares)),
                deadline
            )
        );

        _validateSignature(AUCTION_SIGNER, structHash, deadline, signature);

        DistributionLibrary.validateShares(participants, shares);

        uint256 orderId = _useOrderId();

        _orders[orderId] = Order({
            seller: from,
            buyer: address(0),
            tokenId: tokenId,
            price: price,
            endTime: endTime,
            priceStep: priceStep,
            status: OrderStatus.Placed,
            participants: participants,
            shares: shares
        });

        emit Placed(orderId, tokenId, from, price, priceStep, endTime);
    }

    /**
     * @inheritdoc TokenHolder
     *
     * @dev Method overrides `TokenHolder::_onReceived.`
     *
     * @param data abi.encode(
     *     `price`,
     *     `endTime`,
     *     `priceStep`,
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
            uint256 priceStep,
            uint256 endTime,
            uint256 deadline,
            address[] memory participants,
            uint256[] memory shares,
            bytes memory signature
        ) = abi.decode(data, (uint256, uint256, uint256, uint256, address[], uint256[], bytes));

        _place(from, tokenId, price, priceStep, endTime, deadline, participants, shares, signature);
    }
}
