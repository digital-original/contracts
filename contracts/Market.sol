// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {EIP712Upgradeable} from "@openzeppelin/contracts-upgradeable/utils/cryptography/EIP712Upgradeable.sol";
import {ECDSAUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/cryptography/ECDSAUpgradeable.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IMarket} from "./interfaces/IMarket.sol";

contract Market is IMarket, Initializable, OwnableUpgradeable, EIP712Upgradeable {
    bytes32 public constant ORDER_TYPE =
        keccak256(
            "Order(address seller,uint256 tokenId,uint256 price,address[] participants,uint256[] shares,uint256 nonce)"
        );

    uint256 public orderCount;
    IERC721 public collection;
    address private _orderSigner;

    mapping(uint256 => uint256) public nonces;
    mapping(uint256 => OrderStatus) public statuses;
    mapping(uint256 => Order) private _orders;

    function initialize(IERC721 _collection, address orderSigner_) external initializer {
        __Ownable_init();
        __EIP712_init("Market", "1");

        collection = _collection;
        _orderSigner = orderSigner_;
    }

    modifier placedOrder(uint256 orderId) {
        require(orderId < orderCount, "Market: order does not exist");
        require(statuses[orderId] == OrderStatus.Placed, "Market: order is not placed");
        _;
    }

    function place(
        address seller,
        uint256 tokenId,
        uint256 price,
        address[] memory participants,
        uint256[] memory shares,
        bytes memory signature
    ) external {
        require(seller == msg.sender, "Market: caller is not the seller");
        require(seller.code.length == 0, "Market: seller is not an EOA");

        uint256 nonce = nonces[tokenId]++;

        require(
            _validateSignature(seller, tokenId, price, participants, shares, nonce, signature),
            "Market: invalid signature"
        );

        require(_validateOrder(price, participants, shares), "Market: invalid order");

        uint256 orderId = orderCount++;

        _orders[orderId] = Order(seller, tokenId, price, participants, shares);

        emit Placed(tokenId, seller, price);

        collection.transferFrom(seller, address(this), tokenId);
    }

    function buy(uint256 orderId) external payable placedOrder(orderId) {
        address seller = _orders[orderId].seller;
        uint256 tokenId = _orders[orderId].tokenId;
        uint256 price = _orders[orderId].price;
        address[] memory participants = _orders[orderId].participants;
        uint256[] memory shares = _orders[orderId].shares;

        require(msg.sender != seller, "Market: buyer is seller");
        require(msg.value == price, "Market: invalid ether amount");

        for (uint256 i = 0; i < shares.length; i++) {
            (bool success, ) = participants[i].call{value: shares[i]}("");
            require(success, "Market: unable to send value");
        }

        statuses[orderId] = OrderStatus.Bought;

        emit Bought(tokenId, seller, msg.sender, price);

        collection.transferFrom(address(this), msg.sender, tokenId);
    }

    function cancel(uint256 orderId) external placedOrder(orderId) {
        address seller = _orders[orderId].seller;
        uint256 tokenId = _orders[orderId].tokenId;

        require(seller == msg.sender || msg.sender == owner(), "Market: invalid caller");

        statuses[orderId] = OrderStatus.Cancelled;

        emit Cancelled(tokenId, seller);

        collection.transferFrom(address(this), seller, tokenId);
    }

    function orderSigner(address orderSigner_) external onlyOwner {
        _orderSigner = orderSigner_;
    }

    function orderSigner() external view returns (address) {
        return _orderSigner;
    }

    function order(
        uint256 orderId
    ) external view returns (address seller, uint256 tokenId, uint256 price, OrderStatus status) {
        seller = _orders[orderId].seller;
        tokenId = _orders[orderId].tokenId;
        price = _orders[orderId].price;
        status = statuses[orderId];
    }

    function _validateSignature(
        address seller,
        uint256 tokenId,
        uint256 price,
        address[] memory participants,
        uint256[] memory shares,
        uint256 nonce,
        bytes memory signature
    ) private view returns (bool) {
        bytes32 hash = _hashTypedDataV4(
            keccak256(
                abi.encode(
                    ORDER_TYPE,
                    seller,
                    tokenId,
                    price,
                    keccak256(abi.encodePacked(participants)),
                    keccak256(abi.encodePacked(shares)),
                    nonce
                )
            )
        );

        return _orderSigner == ECDSAUpgradeable.recover(hash, signature);
    }

    function _validateOrder(
        uint256 price,
        address[] memory participants,
        uint256[] memory shares
    ) private pure returns (bool) {
        if (participants.length != shares.length) {
            return false;
        }

        uint256 totalShares;

        for (uint256 i = 0; i < shares.length; i++) {
            totalShares += shares[i];
        }

        if (totalShares != price) {
            return false;
        }

        return true;
    }
}
