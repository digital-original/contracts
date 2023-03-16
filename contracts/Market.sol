// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {BaseMarket} from "./utils/BaseMarket.sol";
import {BaseMarketOwnable} from "./utils/BaseMarketOwnable.sol";
import {IMarket} from "./interfaces/IMarket.sol";

/**
 * @title Market
 * @notice Market contract provides logic for selling and buying ERC-721 tokens.
 * @notice Upgradeable Contract based on [OpenZeppelin](https://docs.openzeppelin.com/) library.
 */
contract Market is Initializable, BaseMarketOwnable, IMarket {
    /// @dev Stores orders by order id.
    mapping(uint256 => Order) private _orders;

    /**
     * @notice Initializes contract.
     * @param collection_ ERC-721 contract address.
     * @param marketSigner_ Data signer address.
     * @param whiteList_ WhiteList contract address.
     * @dev Method should be invoked on proxy contract via `delegatecall`.
     *   See <https://docs.openzeppelin.com/upgrades-plugins/1.x/writing-upgradeable#initializers>.
     */
    function initialize(address collection_, address marketSigner_, address whiteList_) external initializer {
        __BaseMarketOwnable_init(collection_, marketSigner_, whiteList_, "Market", "1");
    }

    /// @inheritdoc IMarket
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

    /**
     * @inheritdoc IMarket
     * @dev To invoke method order must have `Placed` status,
     *   seller can't realize their own order.
     */
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

    /**
     * @inheritdoc IMarket
     * @dev Only seller can invoke `cancel` for their own order,
     *   to invoke method order must have `Placed` status.
     */
    function cancel(uint256 orderId) external {
        _cancel(orderId, msg.sender);
    }

    /**
     * @param orderId Order id.
     * @return seller Token seller address.
     * @return tokenId Token id.
     * @return price Token Price.
     * @return status Order status.
     */
    function order(
        uint256 orderId
    ) external view returns (address seller, uint256 tokenId, uint256 price, OrderStatus status) {
        require(_orders[orderId].status != OrderStatus.NotExists, "Market: order does not exist");

        seller = _orders[orderId].seller;
        tokenId = _orders[orderId].tokenId;
        price = _orders[orderId].price;
        status = _orders[orderId].status;
    }

    /**
     * @inheritdoc BaseMarketOwnable
     * @param seller Token seller address, must be order owner.
     * @dev Cancels token sale order, transfers token back to seller,
     *   to invoke method order must have `Placed` status.
     *   Method overrides `BaseMarketOwnable._cancel`.
     */
    function _cancel(uint256 orderId, address seller) internal override placedOrder(orderId) {
        require(_orders[orderId].seller == seller, "Market: incorrect seller");

        uint256 tokenId = _orders[orderId].tokenId;

        _orders[orderId].status = OrderStatus.Cancelled;

        emit Cancelled(orderId, tokenId, seller);

        _transferToken(address(this), seller, tokenId);
    }

    /**
     * @inheritdoc BaseMarket
     * @dev Method overrides `BaseMarket._orderPlaced.`
     */
    function _orderPlaced(uint256 orderId) internal view override returns (bool) {
        return _orders[orderId].status == OrderStatus.Placed;
    }

    /**
     * @inheritdoc BaseMarketOwnable
     * @dev Method overrides `BaseMarketOwnable._tokenSeller.`
     */
    function _tokenSeller(uint256 orderId) internal view override returns (address) {
        // TODO: method can return address(0)
        return _orders[orderId].seller;
    }

    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     *   variables without shifting down storage in the inheritance chain.
     *   See <https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps>.
     */
    uint256[49] private __gap;
}
