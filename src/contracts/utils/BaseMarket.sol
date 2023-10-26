// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {Upgradeable} from "./Upgradeable.sol";
import {IBaseMarket} from "../interfaces/IBaseMarket.sol";
import {IBaseMarketErrors} from "../interfaces/IBaseMarketErrors.sol";

/**
 * @title BaseMarket
 *
 * @notice Abstract contract BaseMarket provides market basic logic.
 */
abstract contract BaseMarket is Upgradeable, IBaseMarket, IBaseMarketErrors {
    /**
     * @dev Maximum total share.
     */
    uint256 public constant MAX_TOTAL_SHARE = 10_000;

    /**
     * @dev ERC721 token contract address.
     */
    IERC721 public immutable TOKEN;

    /**
     * @dev Number of orders.
     */
    uint256 public orderCount;

    /**
     * @param token ERC721 token contract address.
     */
    constructor(address token) {
        TOKEN = IERC721(token);
    }

    /**
     * @dev Throws if the order is not placed.
     */
    modifier placedOrder(uint256 orderId) {
        if (_orderPlaced(orderId) == false) revert BaseMarketOrderNotPlaced(orderId);
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
     * @inheritdoc IBaseMarket
     *
     * @param data See `_onReceived` method implementation.
     */
    function onERC721Received(
        address,
        address from,
        uint256 tokenId,
        bytes calldata data
    ) external returns (bytes4) {
        if (msg.sender != address(TOKEN)) revert BaseMarketUnauthorizedAccount(msg.sender);

        _onReceived(from, tokenId, data);

        return IBaseMarket.onERC721Received.selector;
    }

    /**
     * @dev Increments order counter.
     *
     * @return New order ID.
     */
    function _useOrderId() internal returns (uint256) {
        return orderCount++;
    }

    /**
     * @dev Transfers token `tokenId` from `from` to `to`.
     *
     * @param from Address from.
     * @param to Address to.
     * @param tokenId Token ID, token must be owned by `from`.
     */
    function _transferToken(address from, address to, uint256 tokenId) internal {
        TOKEN.transferFrom(from, to, tokenId);
    }

    /**
     * @dev Sends Ether to recipient and checks sending result.
     *
     * @param recipient Ether recipient address.
     * @param amount Ether amount.
     */
    function _sendValue(address recipient, uint256 amount) internal {
        (bool success, ) = recipient.call{value: amount}("");
        if (success == false) revert BaseMarketSendValueFailed();
    }

    /**
     * @dev Distributes reward between participants according to shares.
     *
     * @param reward Ether amount to distribute.
     * @param participants Array with participants address.
     * @param shares Array with shares.
     */
    function _distributeReward(uint256 reward, address[] memory participants, uint256[] memory shares) internal {
        uint256 lastShareIndex = shares.length - 1;
        uint256 released;

        for (uint256 i = 0; i < lastShareIndex; i++) {
            uint256 value = (reward * shares[i]) / MAX_TOTAL_SHARE;

            released += value;

            _sendValue(participants[i], value);
        }

        // calculates last share out of loop not to lose wei after division
        _sendValue(participants[lastShareIndex], reward - released);
    }

    /**
     * @dev Checks that number of participants is equal number of shares,
     *   and sum of shares is equal maximum total share. Throws if data is wrong.
     *
     * @param participants Array with participants address.
     * @param shares Array with shares.
     */
    function _validateShares(address[] memory participants, uint256[] memory shares) internal pure {
        if (shares.length != participants.length) revert BaseMarketInvalidSharesNumber();
        if (_sumShares(shares) != MAX_TOTAL_SHARE) revert BaseMarketInvalidSharesSum();
    }

    /**
     * @param shares Array with shares.
     *
     * @return totalShare Sum of shares.
     */
    function _sumShares(uint256[] memory shares) private pure returns (uint256 totalShare) {
        for (uint256 i = 0; i < shares.length; ) {
            totalShare += shares[i];

            unchecked {
                i++;
            }
        }
    }

    /**
     * @dev Method is invoked by `onERC721Received`.
     *
     * @param from Token owner
     * @param tokenId Token ID.
     * @param data Depends on implementation.
     */
    function _onReceived(address from, uint256 tokenId, bytes calldata data) internal virtual;

    /**
     * @param orderId Order ID.
     *
     * @return Returns true if order is placed.
     */
    function _orderPlaced(uint256 orderId) internal view virtual returns (bool);

    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     *   variables without shifting down storage in the inheritance chain.
     *   See <https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps>.
     */
    uint256[49] private __gap;
}
