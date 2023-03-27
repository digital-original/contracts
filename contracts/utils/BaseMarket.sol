// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {IWhiteList} from "../interfaces/IWhiteList.sol";

/**
 * @title BaseMarket
 * @notice Abstract contract BaseMarket provides market basic logic for inheritance.
 * @notice Upgradeable Contract based on [OpenZeppelin](https://docs.openzeppelin.com/) library.
 */
abstract contract BaseMarket is Initializable {
    /// @dev Number of orders.
    uint256 private _orderCount;
    /// @dev Collection contract address.
    IERC721 private _collection;
    /// @dev WhiteList contract address.
    IWhiteList private _whiteList;

    /// @dev Passes only placed orders.
    modifier placedOrder(uint256 orderId) {
        require(_orderPlaced(orderId), "BaseMarket: order is not placed");
        _;
    }

    /// @dev Passes only whitelisted callers.
    modifier onlyWhitelisted() {
        require(_whitelisted(msg.sender), "BaseMarket: invalid caller");
        _;
    }

    /**
     * @param collection_ ERC-721 contract address.
     * @param whiteList_ WhiteList contract address.
     * @dev Initializes contract.
     *   See <https://docs.openzeppelin.com/contracts/4.x/upgradeable#multiple-inheritance>.
     */
    function __BaseMarket_init(address collection_, address whiteList_) internal onlyInitializing {
        __BaseMarket_init_unchained(collection_, whiteList_);
    }

    /**
     * @dev Initializes contract.
     *   See <https://docs.openzeppelin.com/contracts/4.x/upgradeable#multiple-inheritance>.
     */
    function __BaseMarket_init_unchained(address collection_, address whiteList_) internal onlyInitializing {
        _setCollection(collection_);
        _setWhiteList(whiteList_);
    }

    /// @return uint Number of orders.
    function orderCount() external view returns (uint256) {
        return _orderCount;
    }

    /// @return address Collection address.
    function collection() external view returns (IERC721) {
        return _collection;
    }

    /// @return address WhiteList address.
    function whiteList() external view returns (IWhiteList) {
        return _whiteList;
    }

    /**
     * @return uint New order id.
     * @dev Increments counter.
     */
    function _orderId() internal returns (uint256) {
        return _orderCount++;
    }

    /**
     * @param collection_ Collection address.
     * @dev Changes whitelist.
     */
    function _setCollection(address collection_) internal {
        require(
            IERC165(collection_).supportsInterface(type(IERC721).interfaceId),
            "BaseMarket: invalid collection address"
        );

        _collection = IERC721(collection_);
    }

    /**
     * @param whiteList_ WhiteList contract address.
     * @dev Changes WhiteList contract address.
     */
    function _setWhiteList(address whiteList_) internal {
        require(
            IERC165(whiteList_).supportsInterface(type(IWhiteList).interfaceId),
            "BaseMarket: invalid whitelist address"
        );

        _whiteList = IWhiteList(whiteList_);
    }

    /**
     * @param from Address from.
     * @param to Address to.
     * @param tokenId Token Id, token must be owned by `from`.
     * @dev Transfers collection `tokenId` token from `from` to `to`.
     */
    function _transferToken(address from, address to, uint256 tokenId) internal {
        _collection.transferFrom(from, to, tokenId);
    }

    /**
     * @param recipient Ether recipient address.
     * @param amount Ether amount.
     * @dev Sends Ether to recipient and checks sending result.
     */
    function _sendValue(address recipient, uint256 amount) internal {
        (bool success, ) = recipient.call{value: amount}("");
        require(success, "BaseMarket: unable to send value");
    }

    /**
     * @param account Any address.
     * @return bool Returns true if address is whitelisted.
     * @dev Checks whitelist.
     */
    function _whitelisted(address account) internal view returns (bool) {
        return _whiteList.includes(account);
    }

    /**
     * @param price Price amount.
     * @param participants Array with participants address.
     * @param shares Array with shares amounts.
     * @return bool Returns true if data is valid.
     * @dev Checks that number of participants is equal number of shares,
     *   and sum of shares is equal price
     */
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

    /**
     * @param shares Array with shares amounts.
     * @return totalShares Sum of shares.
     */
    function _sumShares(uint256[] memory shares) internal pure returns (uint256 totalShares) {
        for (uint256 i = 0; i < shares.length; i++) {
            totalShares += shares[i];
        }
    }

    /**
     * @param orderId Order id.
     * @return bool Returns true if order is placed.
     */
    function _orderPlaced(uint256 orderId) internal view virtual returns (bool);

    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     *   variables without shifting down storage in the inheritance chain.
     *   See <https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps>.
     */
    uint256[47] private __gap;
}
