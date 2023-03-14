// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IWhiteList} from "../interfaces/IWhiteList.sol";

abstract contract BaseMarket is Initializable {
    uint256 private _orderCount;
    IERC721 private _collection;
    IWhiteList private _whiteList;

    modifier placedOrder(uint256 orderId) {
        require(_orderPlaced(orderId), "BaseMarket: order is not placed");
        _;
    }

    modifier onlyWhitelisted() {
        require(_whitelisted(msg.sender), "BaseMarket: invalid caller");
        _;
    }

    function __BaseMarket_init(address collection_, address whiteList_) internal onlyInitializing {
        __BaseMarket_init_unchained(collection_, whiteList_);
    }

    function __BaseMarket_init_unchained(address collection_, address whiteList_) internal onlyInitializing {
        _setCollection(collection_);
        _setWhiteList(whiteList_);
    }

    function orderCount() external view returns (uint256) {
        return _orderCount;
    }

    function collection() external view returns (IERC721) {
        return _collection;
    }

    function whiteList() external view returns (IWhiteList) {
        return _whiteList;
    }

    function _orderId() internal returns (uint256) {
        return _orderCount++;
    }

    function _setCollection(address collection_) internal {
        require(collection_ != address(0), "BaseMarket: invalid collection address");

        _collection = IERC721(collection_);
    }

    function _setWhiteList(address whiteList_) internal {
        require(whiteList_ != address(0), "BaseMarket: invalid whitelist address");

        _whiteList = IWhiteList(whiteList_);
    }

    function _transferToken(address from, address to, uint256 tokenId) internal {
        _collection.transferFrom(from, to, tokenId);
    }

    function _sendValue(address recipient, uint256 amount) internal {
        (bool success, ) = recipient.call{value: amount}("");
        require(success, "BaseMarket: unable to send value");
    }

    function _whitelisted(address account) internal view returns (bool) {
        return _whiteList.includes(account);
    }

    function _validatePrice(
        uint256 price,
        address[] memory participants,
        uint256[] memory shares
    ) internal pure returns (bool) {
        if (participants.length != shares.length) {
            return false;
        }

        if (price != _sumShares(shares)) {
            return false;
        }

        return true;
    }

    function _sumShares(uint256[] memory shares) internal pure returns (uint256 totalShares) {
        for (uint256 i = 0; i < shares.length; i++) {
            totalShares += shares[i];
        }
    }

    function _orderPlaced(uint256 orderId) internal view virtual returns (bool);

    uint256[47] private __gap;
}
