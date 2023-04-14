// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.16;

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
    /**
     * @dev Collection contract address.
     */
    IERC721 private immutable COLLECTION;

    /**
     * @dev WhiteList contract address.
     */
    IWhiteList private immutable WHITE_LIST;

    /**
     * @dev Number of orders.
     */
    uint256 private _orderCount;

    /**
     * @param _collection ERC-721 contract address.
     * @param _whiteList WhiteList contract address.
     */
    constructor(address _collection, address _whiteList) {
        COLLECTION = IERC721(_collection);
        WHITE_LIST = IWhiteList(_whiteList);
    }

    /**
     * @dev Passes only placed orders.
     */
    modifier placedOrder(uint256 orderId) {
        require(_orderPlaced(orderId), "BaseMarket: order is not placed");
        _;
    }

    /**
     * @dev Passes only whitelisted callers.
     */
    modifier onlyWhitelisted() {
        require(_whitelisted(msg.sender), "BaseMarket: invalid caller");
        _;
    }

    /**
     * @dev Initializes contract.
     *   See <https://docs.openzeppelin.com/contracts/4.x/upgradeable#multiple-inheritance>.
     */
    function __BaseMarket_init() internal onlyInitializing {
        __BaseMarket_init_unchained();
    }

    /**
     * @dev Initializes contract.
     *   See <https://docs.openzeppelin.com/contracts/4.x/upgradeable#multiple-inheritance>.
     */
    function __BaseMarket_init_unchained() internal onlyInitializing {}

    /**
     * @return uint Number of orders.
     */
    function orderCount() external view returns (uint256) {
        return _orderCount;
    }

    /**
     * @return address Collection address.
     */
    function collection() external view returns (IERC721) {
        return COLLECTION;
    }

    /**
     * @return address WhiteList address.
     */
    function whiteList() external view returns (IWhiteList) {
        return WHITE_LIST;
    }

    /**
     * @return uint New order id.
     * @dev Increments counter.
     */
    function _orderId() internal returns (uint256) {
        return _orderCount++;
    }

    /**
     * @param from Address from.
     * @param to Address to.
     * @param tokenId Token Id, token must be owned by `from`.
     * @dev Transfers collection `tokenId` token from `from` to `to`.
     */
    function _transferToken(address from, address to, uint256 tokenId) internal {
        COLLECTION.transferFrom(from, to, tokenId);
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
        return WHITE_LIST.includes(account);
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
    uint256[49] private __gap;
}
