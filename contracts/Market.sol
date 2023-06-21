// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import {BaseMarket} from "./utils/BaseMarket.sol";
import {MarketSigner} from "./utils/MarketSigner.sol";
import {IMarket} from "./interfaces/IMarket.sol";

// TODO: Think about unification `onERC721Received` from Market and Auction

/**
 * @title Market
 * @notice Market contract provides logic for selling and buying ERC-721 tokens.
 * @notice Upgradeable Contract based on [OpenZeppelin](https://docs.openzeppelin.com/) library.
 */
contract Market is Initializable, BaseMarket, MarketSigner, IMarket, IERC721Receiver {
    /**
     * @dev Stores orders by order id.
     */
    mapping(uint256 => Order) private _orders;

    /**
     * @param _collection ERC-721 contract address, immutable.
     * @param _marketSigner Data signer address, immutable.
     */
    constructor(
        address _collection,
        address _marketSigner
    ) BaseMarket(_collection) MarketSigner(_marketSigner, "Market", "1") {}

    /**
     * @notice Initializes contract.
     * @dev Method should be invoked on proxy contract via `delegatecall`.
     *   See <https://docs.openzeppelin.com/upgrades-plugins/1.x/writing-upgradeable#initializers>.
     */
    function initialize() external initializer {
        __BaseMarket_init();
    }

    /**
     * @inheritdoc IMarket
     * @param data Should includes:
     *   1. `uint256 price` - token price.
     *   2. `uint256 expiredBlock` - block number until which `signature` is valid.
     *   3. `address[] participants` - array with addresses between which reward will be distributed.
     *   4. `uint256[] shares` - array with rewards amounts,
     *     order of `shares` corresponds to order of `participants`,
     *     total shares must be equal to `price`.
     *   5. `bytes signature` - [EIP-712](https://eips.ethereum.org/EIPS/eip-712) signature.
     *     Signature must include `expiredBlock` and can include other data for validation.
     *     See `MarketSigner::ORDER_TYPEHASH`.
     */
    function onERC721Received(
        address,
        address from,
        uint256 tokenId,
        bytes calldata data
    ) external override(IMarket, IERC721Receiver) onlyCollection returns (bytes4) {
        (
            uint256 price,
            uint256 expiredBlock,
            address[] memory participants,
            uint256[] memory shares,
            bytes memory signature
        ) = abi.decode(data, (uint256, uint256, address[], uint256[], bytes));

        // TODO: Create private `_place` method

        _validateSignature(from, tokenId, price, expiredBlock, participants, shares, signature);
        _validatePrice(price, participants, shares);

        uint256 orderId = _orderId();

        _orders[orderId] = Order({
            seller: from,
            tokenId: tokenId,
            price: price,
            status: OrderStatus.Placed,
            participants: participants,
            shares: shares
        });

        emit Placed(orderId, tokenId, from, price);

        return IERC721Receiver.onERC721Received.selector;
    }

    /**
     * @inheritdoc IMarket
     * @dev To invoke method order must have `Placed` status,
     *   seller can't realize their own order.
     */
    function realize(uint256 orderId) external payable placedOrder(orderId) {
        address seller = _orders[orderId].seller;

        require(msg.sender != seller, "Market: seller can not be buyer");
        require(msg.value == _orders[orderId].price, "Market: invalid ether amount");

        uint256 tokenId = _orders[orderId].tokenId;

        _orders[orderId].status = OrderStatus.Realized;

        emit Realized(orderId, tokenId, msg.sender, seller, msg.value);

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
    function cancel(uint256 orderId) external placedOrder(orderId) {
        require(_orders[orderId].seller == msg.sender, "Market: invalid caller");

        uint256 tokenId = _orders[orderId].tokenId;

        _orders[orderId].status = OrderStatus.Cancelled;

        emit Cancelled(orderId, tokenId, msg.sender);

        _transferToken(address(this), msg.sender, tokenId);
    }

    /**
     * @inheritdoc IMarket
     */
    function order(uint256 orderId) external view returns (Order memory) {
        require(_orders[orderId].status != OrderStatus.NotExists, "Market: order does not exist");
        return _orders[orderId];
    }

    /**
     * @inheritdoc BaseMarket
     * @dev Method overrides `BaseMarket._orderPlaced.`
     */
    function _orderPlaced(uint256 orderId) internal view override returns (bool) {
        return _orders[orderId].status == OrderStatus.Placed;
    }

    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     *   variables without shifting down storage in the inheritance chain.
     *   See <https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps>.
     */
    uint256[49] private __gap;
}
