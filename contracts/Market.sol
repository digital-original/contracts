// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {BaseMarketOwnable} from "./utils/BaseMarketOwnable.sol";
import {IMarket} from "./interfaces/IMarket.sol";

contract Market is Initializable, BaseMarketOwnable, IMarket {
    mapping(uint256 => Order) private _orders;

    function initialize(address collection, address marketSigner, address whiteList) external initializer {
        __BaseMarketOwnable_init(collection, marketSigner, whiteList, "Market", "1");
    }

    function place(
        uint256 tokenId,
        uint256 price,
        uint256 expiredBlock,
        address[] memory participants,
        uint256[] memory shares,
        bytes memory signature
    ) external {
        require(
            _validateSignature(msg.sender, tokenId, price, expiredBlock, participants, shares, signature),
            "Market: unauthorized"
        );

        require(_validatePrice(price, participants, shares), "Market: invalid order");

        uint256 orderId = _orderId();

        _orders[orderId] = Order({
            seller: msg.sender,
            tokenId: tokenId,
            price: price,
            status: OrderStatus.Placed,
            participants: participants,
            shares: shares
        });

        emit Placed(orderId, tokenId, msg.sender, price);

        _transferToken(msg.sender, address(this), tokenId);
    }

    function buy(uint256 orderId) external payable placedOrder(orderId) {
        address seller = _orders[orderId].seller;

        require(msg.sender != seller, "Market: seller can not be buyer");
        require(msg.value == _orders[orderId].price, "Market: invalid ether amount");

        uint256 tokenId = _orders[orderId].tokenId;

        _orders[orderId].status = OrderStatus.Bought;

        emit Bought(orderId, tokenId, msg.sender, seller, msg.value);

        _transferToken(address(this), msg.sender, tokenId);

        address[] memory participants = _orders[orderId].participants;
        uint256[] memory shares = _orders[orderId].shares;

        for (uint256 i = 0; i < shares.length; i++) {
            _sendValue(participants[i], shares[i]);
        }
    }

    function cancel(uint256 orderId) external {
        _cancel(orderId, msg.sender);
    }

    function order(
        uint256 orderId
    ) external view returns (address seller, uint256 tokenId, uint256 price, OrderStatus status) {
        require(_orders[orderId].status != OrderStatus.NotExists, "Market: order does not exist");

        seller = _orders[orderId].seller;
        tokenId = _orders[orderId].tokenId;
        price = _orders[orderId].price;
        status = _orders[orderId].status;
    }

    function _cancel(uint256 orderId, address seller) internal override placedOrder(orderId) {
        require(_orders[orderId].seller == seller, "Market: incorrect seller");

        uint256 tokenId = _orders[orderId].tokenId;

        _orders[orderId].status = OrderStatus.Cancelled;

        emit Cancelled(orderId, tokenId, seller);

        _transferToken(address(this), seller, tokenId);
    }

    function _orderPlaced(uint256 orderId) internal view override returns (bool) {
        return _orders[orderId].status == OrderStatus.Placed;
    }

    function _orderSeller(uint256 orderId) internal virtual override returns (address) {
        return _orders[orderId].seller;
    }

    uint256[49] private __gap;
}
