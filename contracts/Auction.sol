// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {BaseMarket} from "./utils/BaseMarket.sol";
import {BaseMarketOwnable} from "./utils/BaseMarketOwnable.sol";
import {IAuction} from "./interfaces/IAuction.sol";

/**
 * @title Auction
 * @notice Auction contract provides logic for creating auction with ERC-721 tokens.
 * @notice Upgradeable Contract based on [OpenZeppelin](https://docs.openzeppelin.com/) library.
 */
contract Auction is Initializable, BaseMarketOwnable, IAuction {
    /// @dev Stores auction orders by order id.
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
        __BaseMarketOwnable_init(collection_, marketSigner_, whiteList_, "Auction", "1");
    }

    /// @inheritdoc IAuction
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
            // TODO: Think about handling call result
            prevBuyer.call{value: prevPrice}("");
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

            // TODO: explain this place

            _sendValue(participants[lastShareIndex], price - released);
        } else {
            _transferToken(address(this), seller, tokenId);
        }
    }

    /**
     * @param orderId Auction order id.
     * @return seller Token seller address.
     * @return buyer Last buyer address.
     * @return tokenId Token id.
     * @return price Last price.
     * @return endBlock Block number until which the auction continues.
     * @return priceStep Minimum price raise step.
     * @return status Auction order status.
     */
    function order(
        uint256 orderId
    )
        external
        view
        returns (
            address seller,
            address buyer,
            uint256 tokenId,
            uint256 price,
            uint256 endBlock,
            uint256 priceStep,
            OrderStatus status
        )
    {
        require(_orders[orderId].status != OrderStatus.NotExists, "Auction: order does not exist");

        seller = _orders[orderId].seller;
        buyer = _orders[orderId].buyer;
        tokenId = _orders[orderId].tokenId;
        price = _orders[orderId].price;
        endBlock = _orders[orderId].endBlock;
        priceStep = _orders[orderId].priceStep;
        status = _orders[orderId].status;
    }

    /**
     * @param orderId Auction order id.
     * @dev Cancels auction order, transfers token back to seller,
     *   returns locked Ether back to buyer if buyer exists.
     *   To invoke method order must have `Placed` status.
     *   Method overrides `BaseMarketOwnable._cancel`.
     */
    function _cancel(uint256 orderId, address) internal override placedOrder(orderId) {
        address seller = _orders[orderId].seller;
        address buyer = _orders[orderId].buyer;
        uint256 tokenId = _orders[orderId].tokenId;

        _orders[orderId].status = OrderStatus.Cancelled;

        emit Cancelled(orderId, tokenId, seller);

        _transferToken(address(this), seller, tokenId);

        if (buyer != address(0)) {
            // TODO: Think about handling call result
            buyer.call{value: _orders[orderId].price}("");
        }
    }

    /**
     * @inheritdoc BaseMarket
     * @param orderId Auction order id.
     * @dev Method overrides `BaseMarket._orderPlaced.`
     */
    function _orderPlaced(uint256 orderId) internal view override returns (bool) {
        return _orders[orderId].status == OrderStatus.Placed;
    }

    /// @dev Method overrides `BaseMarketOwnable._tokenSeller`.
    function _tokenSeller(uint256) internal override returns (address) {}

    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     *   variables without shifting down storage in the inheritance chain.
     *   See <https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps>.
     */
    uint256[49] private __gap;
}
