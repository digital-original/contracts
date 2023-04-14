// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.16;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {BaseMarket} from "./utils/BaseMarket.sol";
import {MarketSigner} from "./utils/MarketSigner.sol";
import {IAuction} from "./interfaces/IAuction.sol";

// TODO: review error msg

/**
 * @title Auction
 * @notice Auction contract provides logic for creating auction with ERC-721 tokens.
 * @notice Upgradeable Contract based on [OpenZeppelin](https://docs.openzeppelin.com/) library.
 */
contract Auction is Initializable, BaseMarket, MarketSigner, IAuction {
    /**
     * @dev Stores auction orders by order id.
     */
    mapping(uint256 => Order) private _orders;

    /**
     *
     * @param _collection ERC-721 contract address, immutable.
     * @param _whiteList WhiteList contract address, immutable.
     * @param _marketSigner Data signer address, immutable.
     */
    constructor(
        address _collection,
        address _whiteList,
        address _marketSigner
    ) BaseMarket(_collection, _whiteList) MarketSigner(_marketSigner) {}

    /**
     * @notice Initializes contract.
     * @dev Method should be invoked on proxy contract via `delegatecall`.
     *   See <https://docs.openzeppelin.com/upgrades-plugins/1.x/writing-upgradeable#initializers>.
     */
    function initialize() external initializer {
        __BaseMarket_init();
        __MarketSigner_init("Auction", "1");
    }

    /**
     * @inheritdoc IAuction
     */
    function place(
        uint256 tokenId,
        uint256 price,
        uint256 endBlock,
        uint256 priceStep,
        uint256 expiredBlock,
        address[] memory participants,
        uint256[] memory shares,
        bytes memory signature
    ) external {
        require(endBlock > block.number, "Auction: end block is less than current");

        require(
            _validateSignature(msg.sender, tokenId, price, expiredBlock, participants, shares, signature),
            "Auction: unauthorized"
        );

        // TODO: add priceStep validation

        require(_validatePrice(price, participants, shares), "Auction: invalid price");

        uint256 orderId = _orderId();

        _orders[orderId] = Order({
            seller: msg.sender,
            buyer: address(0),
            tokenId: tokenId,
            price: price,
            endBlock: endBlock,
            priceStep: priceStep,
            status: OrderStatus.Placed,
            participants: participants,
            shares: shares
        });

        emit Placed(orderId, tokenId, msg.sender, price);

        _transferToken(msg.sender, address(this), tokenId);
    }

    /**
     * @inheritdoc IAuction
     * @dev To invoke method order must have `Placed` status and auction must be ongoing,
     *   seller can't raise price in their own order,
     *   caller address must be whitelisted.
     */
    function raise(uint256 orderId) external payable placedOrder(orderId) onlyWhitelisted {
        // TODO: how should work first raise?
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
     * @dev To invoke method order must have `Placed` status and auction must not be ongoing,
     *   seller can't raise price in their own order,
     *   caller address must be whitelisted.
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
     * @inheritdoc BaseMarket
     * @param orderId Auction order id.
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
