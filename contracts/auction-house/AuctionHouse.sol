// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {EIP712} from "../utils/EIP712.sol";
import {Distribution} from "../utils/Distribution.sol";
import {IArtToken} from "../art-token/IArtToken.sol";
import {AuctionHouseStorage} from "./AuctionHouseStorage.sol";
import {IAuctionHouse} from "./IAuctionHouse.sol";

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

    address public immutable ADMIN;
    address public immutable PLATFORM;
    IArtToken public immutable TOKEN;
    IERC20 public immutable USDC;

    modifier auctionExists(uint256 auctionId) {
        if (!_auctionExists(auctionId)) {
            revert AuctionHouseAuctionNotExist();
        }

        _;
    }

    modifier auctionNotExist(uint256 auctionId) {
        if (_auctionExists(auctionId)) {
            revert AuctionHouseAuctionExists();
        }

        _;
    }

    modifier auctionEnded(uint256 auctionId) {
        if (!_auctionEnded(auctionId)) {
            revert AuctionHouseAuctionNotEnded();
        }

        _;
    }

    modifier auctionNotEnded(uint256 auctionId) {
        if (_auctionEnded(auctionId)) {
            revert AuctionHouseAuctionEnded();
        }

        _;
    }

    modifier notSold(uint256 auctionId) {
        AuctionHouseStorage.Layout storage $ = AuctionHouseStorage.layout();

        if ($.auctions[auctionId].sold) {
            revert AuctionHouseAuctionSold();
        }

        _;
    }

    modifier withBuyer(uint256 auctionId) {
        AuctionHouseStorage.Layout storage $ = AuctionHouseStorage.layout();

        if ($.auctions[auctionId].buyer == address(0)) {
            revert AuctionHouseBuyerNotExists();
        }

        _;
    }

    modifier withoutBuyer(uint256 auctionId) {
        AuctionHouseStorage.Layout storage $ = AuctionHouseStorage.layout();

        if ($.auctions[auctionId].buyer != address(0)) {
            revert AuctionHouseBuyerExists();
        }

        _;
    }

    constructor(address admin, address platform, IArtToken token, IERC20 usdc) EIP712("AuctionHouse", "1") {
        ADMIN = admin;
        PLATFORM = platform;
        TOKEN = token;
        USDC = usdc;
    }

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
                params.participants,
                params.shares,
                params.deadline
            )
        );

        _requireValidSignature(ADMIN, structHash, params.deadline, params.signature);

        _requireValidEndTime(params.endTime);

        AuctionHouseStorage.Layout storage $ = AuctionHouseStorage.layout();

        $.auctions[params.auctionId] = Auction({
            tokenId: params.tokenId,
            tokenURI: params.tokenURI,
            buyer: address(0),
            price: params.price,
            fee: params.fee,
            step: params.step,
            endTime: params.endTime,
            sold: false,
            participants: params.participants,
            shares: params.shares
        });

        emit Created(params.auctionId, params.tokenId, params.price, params.endTime);
    }

    function raise(
        uint256 auctionId,
        uint256 price,
        bool /* initial */
    ) external auctionNotEnded(auctionId) withoutBuyer(auctionId) {
        AuctionHouseStorage.Layout storage $ = AuctionHouseStorage.layout();

        _requireValidRaise(price, $.auctions[auctionId].price, 0);

        USDC.safeTransferFrom(msg.sender, address(this), price + $.auctions[auctionId].fee);

        _updateAuction(auctionId, msg.sender, price);

        emit Raised(auctionId, msg.sender, price);
    }

    function raise(uint256 auctionId, uint256 price) external auctionNotEnded(auctionId) withBuyer(auctionId) {
        AuctionHouseStorage.Layout storage $ = AuctionHouseStorage.layout();

        uint256 oldPrice = $.auctions[auctionId].price;

        _requireValidRaise(price, oldPrice, $.auctions[auctionId].step);

        uint256 fee = $.auctions[auctionId].fee;

        USDC.safeTransferFrom(msg.sender, address(this), price + fee);
        USDC.safeTransfer($.auctions[auctionId].buyer, oldPrice + fee);

        _updateAuction(auctionId, msg.sender, price);

        emit Raised(auctionId, msg.sender, price);
    }

    function finish(uint256 auctionId) external auctionEnded(auctionId) notSold(auctionId) withBuyer(auctionId) {
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

    function auction(uint256 auctionId) external view auctionExists(auctionId) returns (Auction memory) {
        AuctionHouseStorage.Layout storage $ = AuctionHouseStorage.layout();

        return $.auctions[auctionId];
    }

    function _auctionEnded(uint256 auctionId) private view auctionExists(auctionId) returns (bool) {
        AuctionHouseStorage.Layout storage $ = AuctionHouseStorage.layout();

        return $.auctions[auctionId].endTime < block.timestamp;
    }

    function _auctionExists(uint256 auctionId) private view returns (bool) {
        AuctionHouseStorage.Layout storage $ = AuctionHouseStorage.layout();

        return $.auctions[auctionId].endTime != 0;
    }

    function _requireValidEndTime(uint256 endTime) private view {
        if (endTime <= block.timestamp) {
            revert AuctionHouseInvalidEndTime();
        }
    }

    function _requireValidRaise(uint256 newPrice, uint256 oldPrice, uint256 step) private pure {
        if (newPrice < oldPrice + step) {
            revert AuctionHouseRaiseTooSmall();
        }
    }

    function _updateAuction(uint256 auctionId, address buyer, uint256 price) private {
        AuctionHouseStorage.Layout storage $ = AuctionHouseStorage.layout();

        $.auctions[auctionId].buyer = buyer;
        $.auctions[auctionId].price = price;
    }
}
