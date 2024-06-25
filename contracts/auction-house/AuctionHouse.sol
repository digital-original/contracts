// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {EIP712} from "../utils/EIP712.sol";
import {Distribution} from "../utils/Distribution.sol";
import {IArtToken} from "../art-token/IArtToken.sol";
import {AuctionHouseStorage} from "./AuctionHouseStorage.sol";
import {IAuctionHouse} from "./IAuctionHouse.sol";

/**
 * @title AuctionHouse
 *
 * @notice AuctionHouse contract provides functionality to sell Digital Original NFTs according to auction rules.
 */
contract AuctionHouse is IAuctionHouse, EIP712 {
    using SafeERC20 for IERC20;

    bytes32 public constant CREATE_PERMIT_TYPE_HASH =
        // prettier-ignore
        keccak256(
            "CreatePermit("
                "uint256 auctionId,"
                "uint256 tokenId,"
                "string tokenURI,"
                "uint256 price,"
                "uint256 fee,"
                "uint256 step,"
                "uint256 endTime,"
                "address[] participants,"
                "uint256[] shares,"
                "uint256 deadline"
            ")"
        );

    address public immutable ADMIN; // Admin address.
    address public immutable PLATFORM; // Platform address.
    IArtToken public immutable TOKEN; // ArtToken contract address.
    IERC20 public immutable USDC; // USDC asset contract address.

    /**
     * @dev Throws if the auction does not exist.
     */
    modifier auctionExists(uint256 auctionId) {
        if (!_auctionExists(auctionId)) {
            revert AuctionHouseAuctionNotExist(auctionId);
        }

        _;
    }

    /**
     * @dev Throws if the auction exists.
     */
    modifier auctionNotExist(uint256 auctionId) {
        if (_auctionExists(auctionId)) {
            revert AuctionHouseAuctionExists(auctionId);
        }

        _;
    }

    /**
     * @dev Throws if the auction has not yet ended.
     */
    modifier auctionEnded(uint256 auctionId) {
        if (!_auctionEnded(auctionId)) {
            AuctionHouseStorage.Layout storage $ = AuctionHouseStorage.layout();

            revert AuctionHouseAuctionNotEnded(auctionId, $.auctions[auctionId].endTime, block.timestamp);
        }

        _;
    }

    /**
     * @dev Throws if the auction has already ended.
     */
    modifier auctionNotEnded(uint256 auctionId) {
        if (_auctionEnded(auctionId)) {
            AuctionHouseStorage.Layout storage $ = AuctionHouseStorage.layout();

            revert AuctionHouseAuctionEnded(auctionId, $.auctions[auctionId].endTime, block.timestamp);
        }

        _;
    }

    /**
     * @dev Throws if the token for the auction has already been sold.
     */
    modifier notSold(uint256 auctionId) {
        AuctionHouseStorage.Layout storage $ = AuctionHouseStorage.layout();

        if ($.auctions[auctionId].sold) {
            revert AuctionHouseTokenSold(auctionId);
        }

        _;
    }

    /**
     * @dev Throws if the auction does not have a buyer.
     */
    modifier withBuyer(uint256 auctionId) {
        if (!_auctionWithBuyer(auctionId)) {
            revert AuctionHouseBuyerNotExists(auctionId);
        }

        _;
    }

    /**
     * @dev Throws if the auction has a buyer.
     */
    modifier withoutBuyer(uint256 auctionId) {
        if (_auctionWithBuyer(auctionId)) {
            AuctionHouseStorage.Layout storage $ = AuctionHouseStorage.layout();

            revert AuctionHouseBuyerExists(auctionId, $.auctions[auctionId].buyer);
        }

        _;
    }

    /**
     * @param admin Admin address.
     * @param platform Platform address.
     * @param token ArtToken contract address.
     * @param usdc USDC asset contract address.
     */
    constructor(address admin, address platform, address token, address usdc) EIP712("AuctionHouse", "1") {
        if (admin == address(0)) revert AuctionHouseZeroAddress();
        if (platform == address(0)) revert AuctionHouseZeroAddress();
        if (token == address(0)) revert AuctionHouseZeroAddress();
        if (usdc == address(0)) revert AuctionHouseZeroAddress();

        ADMIN = admin;
        PLATFORM = platform;
        TOKEN = IArtToken(token);
        USDC = IERC20(usdc);
    }

    /**
     * @inheritdoc IAuctionHouse
     *
     * @dev Creates new `Auction` without `buyer` and with initial `price`.
     * Emits `Created` event.
     */
    function create(CreateParams calldata params) external auctionNotExist(params.auctionId) {
        bytes32 structHash = keccak256(
            abi.encode(
                CREATE_PERMIT_TYPE_HASH,
                params.auctionId,
                params.tokenId,
                keccak256(bytes(params.tokenURI)),
                params.price,
                params.fee,
                params.step,
                params.endTime,
                keccak256(abi.encodePacked(params.participants)),
                keccak256(abi.encodePacked(params.shares)),
                params.deadline
            )
        );

        _requireValidSignature(ADMIN, structHash, params.deadline, params.signature);

        _requireNotEmptyTokenURI(params.tokenURI);

        _requireValidEndTime(params.endTime);

        _requireNotReservedToken(params.tokenId);

        Distribution.requireValidConditions(params.participants, params.shares);

        AuctionHouseStorage.Layout storage $ = AuctionHouseStorage.layout();

        $.auctions[params.auctionId] = Auction({
            tokenId: params.tokenId,
            price: params.price,
            fee: params.fee,
            step: params.step,
            endTime: params.endTime,
            buyer: address(0),
            sold: false,
            tokenURI: params.tokenURI,
            participants: params.participants,
            shares: params.shares
        });

        $.tokenAuctionIds[params.tokenId] = params.auctionId;

        emit Created(params.auctionId, params.tokenId, params.price, params.endTime);
    }

    /**
     * @inheritdoc IAuctionHouse
     *
     * @dev Charges `price` and `fee` from `msg.sender`, updates `buyer` and `price`.
     * Emits `Raised` event.
     *
     * @dev `price` must be greater than or equal to initial `price`.
     */
    function raiseInitial(
        uint256 auctionId,
        uint256 price
    ) external auctionExists(auctionId) auctionNotEnded(auctionId) withoutBuyer(auctionId) {
        AuctionHouseStorage.Layout storage $ = AuctionHouseStorage.layout();

        _requireValidRaise(price, $.auctions[auctionId].price, 0);

        _requireValidBuyer(msg.sender);

        _raise(auctionId, msg.sender, price);

        USDC.safeTransferFrom(msg.sender, address(this), price + $.auctions[auctionId].fee);
    }

    /**
     * @inheritdoc IAuctionHouse
     *
     * @dev Charges `price` and `fee` from `msg.sender`, updates `buyer` and `price`.
     * Refunds old `price` and `fee` to the previous `buyer`. Emits `Raised` event.
     *
     * @dev `price` must be greater than or equal to previous `price` plus `step`.
     */
    function raise(
        uint256 auctionId,
        uint256 price
    ) external auctionExists(auctionId) auctionNotEnded(auctionId) withBuyer(auctionId) {
        AuctionHouseStorage.Layout storage $ = AuctionHouseStorage.layout();

        uint256 oldPrice = $.auctions[auctionId].price;
        address oldBuyer = $.auctions[auctionId].buyer;

        _requireValidRaise(price, oldPrice, $.auctions[auctionId].step);

        _requireValidBuyer(msg.sender);

        _raise(auctionId, msg.sender, price);

        uint256 fee = $.auctions[auctionId].fee;

        USDC.safeTransferFrom(msg.sender, address(this), price + fee);
        USDC.safeTransfer(oldBuyer, oldPrice + fee);
    }

    /**
     * @inheritdoc IAuctionHouse
     *
     * @dev Mints a new token for `buyer`. Distributes reward according to `participants` and `shares`.
     * Transfers `fee` to platform address. Marks the auction as sold. Emits `Sold` event.
     */
    function finish(
        uint256 auctionId
    ) external auctionExists(auctionId) auctionEnded(auctionId) withBuyer(auctionId) notSold(auctionId) {
        AuctionHouseStorage.Layout storage $ = AuctionHouseStorage.layout();

        $.auctions[auctionId].sold = true;

        emit Sold(auctionId);

        TOKEN.mint($.auctions[auctionId].buyer, $.auctions[auctionId].tokenId, $.auctions[auctionId].tokenURI);

        USDC.safeTransfer(PLATFORM, $.auctions[auctionId].fee);

        Distribution.distribute(
            USDC,
            $.auctions[auctionId].price,
            $.auctions[auctionId].participants,
            $.auctions[auctionId].shares
        );
    }

    /**
     * @inheritdoc IAuctionHouse
     */
    function auction(uint256 auctionId) external view auctionExists(auctionId) returns (Auction memory) {
        AuctionHouseStorage.Layout storage $ = AuctionHouseStorage.layout();

        return $.auctions[auctionId];
    }

    /**
     * @inheritdoc IAuctionHouse
     */
    function tokenReserved(uint256 tokenId) public view returns (bool) {
        AuctionHouseStorage.Layout storage $ = AuctionHouseStorage.layout();

        uint256 auctionId = $.tokenAuctionIds[tokenId];

        if (auctionId == 0) {
            // The auction does not exist
            return false;
        }

        if (!_auctionEnded(auctionId)) {
            // The auction has not ended
            return true;
        }

        if (_auctionWithBuyer(auctionId)) {
            // The auction has a buyer
            return true;
        }

        // The auction has ended without a buyer
        return false;
    }

    /**
     * @dev Returns true if the auction has ended.
     */
    function _auctionEnded(uint256 auctionId) private view returns (bool) {
        AuctionHouseStorage.Layout storage $ = AuctionHouseStorage.layout();

        return $.auctions[auctionId].endTime < block.timestamp;
    }

    /**
     * @dev Returns true if the auction exists.
     */
    function _auctionExists(uint256 auctionId) private view returns (bool) {
        _requireNotZeroId(auctionId);

        AuctionHouseStorage.Layout storage $ = AuctionHouseStorage.layout();

        return $.auctions[auctionId].endTime != 0;
    }

    /**
     * @dev Returns true if the auction is with a buyer.
     */
    function _auctionWithBuyer(uint256 auctionId) private view returns (bool) {
        AuctionHouseStorage.Layout storage $ = AuctionHouseStorage.layout();

        return $.auctions[auctionId].buyer != address(0);
    }

    /**
     * @dev Throws if the tokenURI is an empty string.
     */
    function _requireNotEmptyTokenURI(string memory tokenURI) private pure {
        if (bytes(tokenURI).length == 0) {
            revert AuctionHouseEmptyTokenURI();
        }
    }

    /**
     * @dev Throws if the auction end time is invalid.
     */
    function _requireValidEndTime(uint256 endTime) private view {
        if (endTime <= block.timestamp) {
            revert AuctionHouseInvalidEndTime(endTime, block.timestamp);
        }
    }

    /**
     * @dev Throws if the token is reserved.
     */
    function _requireNotReservedToken(uint256 tokenId) private view {
        if (tokenReserved(tokenId) || TOKEN.tokenReserved(tokenId)) {
            revert AuctionHouseTokenReserved(tokenId);
        }
    }

    /**
     * @dev Throws if the buyer is invalid.
     */
    function _requireValidBuyer(address buyer) private view {
        if (buyer.code.length > 0) {
            revert AuctionHouseInvalidBuyer(buyer);
        }
    }

    /**
     * @dev Throws if the auction id is zero.
     */
    function _requireNotZeroId(uint256 auctionId) private pure {
        if (auctionId == 0) {
            revert AuctionHouseZeroId();
        }
    }

    /**
     * @dev Throws if the raise is less than the old price plus the price step.
     */
    function _requireValidRaise(uint256 newPrice, uint256 oldPrice, uint256 step) private pure {
        if (newPrice < oldPrice + step) {
            revert AuctionHouseRaiseTooSmall(newPrice, oldPrice + step);
        }
    }

    /**
     * @dev Updates `buyer` and `price` for the auction `auctionId`.
     * Emits `Raised` event.
     */
    function _raise(uint256 auctionId, address buyer, uint256 price) private {
        AuctionHouseStorage.Layout storage $ = AuctionHouseStorage.layout();

        $.auctions[auctionId].buyer = buyer;
        $.auctions[auctionId].price = price;

        emit Raised(auctionId, buyer, price);
    }
}
