// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {Address} from "@openzeppelin/contracts/utils/Address.sol";
import {EIP712} from "../utils/EIP712.sol";
import {Distribution} from "../utils/Distribution.sol";
import {TokenHolder} from "../utils/TokenHolder.sol";
import {AuctionHouseStorage} from "./AuctionHouseStorage.sol";
import {IAuctionHouse} from "./IAuctionHouse.sol";

contract AuctionHouse is IAuctionHouse, TokenHolder, EIP712 {
    bytes32 public constant AUCTION_PERMIT_TYPE_HASH =
        // prettier-ignore
        keccak256(
            "AuctionPermit("
                "uint256 tokenId,"
                "address seller,"
                "address asset,"
                "uint256 price,"
                "uint256 step,"
                "uint256 penalty,"
                "uint256 startTime,"
                "uint256 endTime,"
                "uint256 deadline,"
                "address[] participants,"
                "uint256[] shares"
            ")"
        );

    address public immutable AUCTION_SIGNER;
    address public immutable PLATFORM;

    modifier auctionOngoing(uint256 auctionId) {
        AuctionHouseStorage.Layout storage $ = AuctionHouseStorage.layout();

        _requireExist(auctionId);

        if (!($.auctions[auctionId].startTime <= block.timestamp)) {
            revert AuctionHouseAuctionNotStarted($.auctions[auctionId].startTime);
        }

        if (!($.auctions[auctionId].endTime > block.timestamp)) {
            revert AuctionHouseAuctionEnded($.auctions[auctionId].endTime);
        }

        _;
    }

    modifier auctionEnded(uint256 auctionId) {
        AuctionHouseStorage.Layout storage $ = AuctionHouseStorage.layout();

        _requireExist(auctionId);

        if ($.auctions[auctionId].completed) {
            revert AuctionHouseAuctionCompleted();
        }

        if (!($.auctions[auctionId].endTime <= block.timestamp)) {
            revert AuctionHouseAuctionNotEnded($.auctions[auctionId].endTime);
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
            revert AuctionHouseBuyerExists($.auctions[auctionId].buyer);
        }

        _;
    }

    constructor(address token, address platform, address auctionSigner) TokenHolder(token) EIP712("AuctionHouse", "1") {
        PLATFORM = platform;
        AUCTION_SIGNER = auctionSigner;
    }

    function raise(
        uint256 auctionId,
        bool /* initial */
    ) external payable auctionOngoing(auctionId) withoutBuyer(auctionId) {
        AuctionHouseStorage.Layout storage $ = AuctionHouseStorage.layout();

        if (msg.value < $.auctions[auctionId].price) {
            revert AuctionHouseRaiseTooSmall(msg.value, $.auctions[auctionId].price);
        }

        $.auctions[auctionId].buyer = msg.sender;
        $.auctions[auctionId].price = msg.value;

        emit Raised(auctionId, msg.sender, msg.value);
    }

    function raise(uint256 auctionId) external payable auctionOngoing(auctionId) withBuyer(auctionId) {
        AuctionHouseStorage.Layout storage $ = AuctionHouseStorage.layout();

        uint256 price = $.auctions[auctionId].price;

        if (msg.value < price + $.auctions[auctionId].step) {
            revert AuctionHouseRaiseTooSmall(msg.value, price + $.auctions[auctionId].step);
        }

        address prevBuyer = $.auctions[auctionId].buyer;

        $.auctions[auctionId].buyer = msg.sender;
        $.auctions[auctionId].price = msg.value;

        emit Raised(auctionId, msg.sender, msg.value);

        Address.sendValue(payable(prevBuyer), price);
    }

    function take(uint256 auctionId) external payable auctionEnded(auctionId) withBuyer(auctionId) {
        AuctionHouseStorage.Layout storage $ = AuctionHouseStorage.layout();

        $.auctions[auctionId].completed = true;

        emit Completed(auctionId, CompletionWay.Taken);

        _transferToken($.auctions[auctionId].buyer, $.auctions[auctionId].tokenId);

        Distribution.distribute(
            $.auctions[auctionId].price,
            $.auctions[auctionId].participants,
            $.auctions[auctionId].shares
        );
    }

    function buy(uint256 auctionId) external payable auctionEnded(auctionId) withoutBuyer(auctionId) {
        AuctionHouseStorage.Layout storage $ = AuctionHouseStorage.layout();

        if (msg.value != $.auctions[auctionId].price) {
            revert AuctionHouseWrongPayment(msg.value, $.auctions[auctionId].price);
        }

        $.auctions[auctionId].buyer = msg.sender;
        $.auctions[auctionId].completed = true;

        emit Completed(auctionId, CompletionWay.Bought);

        _transferToken(msg.sender, $.auctions[auctionId].tokenId);

        Distribution.distribute(msg.value, $.auctions[auctionId].participants, $.auctions[auctionId].shares);
    }

    function unlock(uint256 auctionId) external payable auctionEnded(auctionId) withoutBuyer(auctionId) {
        AuctionHouseStorage.Layout storage $ = AuctionHouseStorage.layout();

        if (msg.value != $.auctions[auctionId].penalty) {
            revert AuctionHouseWrongPenalty(msg.value, $.auctions[auctionId].penalty);
        }

        $.auctions[auctionId].completed = true;

        emit Completed(auctionId, CompletionWay.Unlocked);

        _transferToken($.auctions[auctionId].seller, $.auctions[auctionId].tokenId);

        Address.sendValue(payable(PLATFORM), msg.value);
    }

    function auctionsCount() external view returns (uint256 count) {
        AuctionHouseStorage.Layout storage $ = AuctionHouseStorage.layout();

        return $.auctionsCount;
    }

    function auction(uint256 auctionId) external view returns (Auction memory) {
        _requireExist(auctionId);

        AuctionHouseStorage.Layout storage $ = AuctionHouseStorage.layout();

        return $.auctions[auctionId];
    }

    function _crate(
        uint256 tokenId,
        address seller,
        address asset,
        uint256 price,
        uint256 step,
        uint256 penalty,
        uint256 startTime,
        uint256 endTime,
        address[] memory participants,
        uint256[] memory shares
    ) private {
        if (!(startTime < endTime)) {
            revert AuctionHouseInvalidStartTime(startTime, endTime);
        }

        if (!(endTime > block.timestamp)) {
            revert AuctionHouseInvalidEndTime(endTime, block.timestamp);
        }

        Distribution.validateShares(participants, shares);

        uint256 auctionId = _useAuctionId();

        AuctionHouseStorage.Layout storage $ = AuctionHouseStorage.layout();

        $.auctions[auctionId] = Auction({
            tokenId: tokenId,
            seller: seller,
            buyer: address(0),
            asset: asset,
            price: price,
            step: step,
            penalty: penalty,
            platformFee: 0,
            startTime: startTime,
            endTime: endTime,
            participants: participants,
            completed: false,
            shares: shares
        });

        emit Created(auctionId, tokenId, seller, asset, price, step, startTime, endTime);
    }

    /**
     * @inheritdoc TokenHolder
     *
     * @dev Method overrides `TokenHolder::_onReceived.`
     *
     * @param data AuctionData - abi.encode(
     *     uint256   tokenId
     *     address   seller
     *     address   asset
     *     uint256   price
     *     uint256   step
     *     uint256   penalty
     *     uint256   startTime
     *     uint256   endTime
     *     uint256   deadline
     *     address[] participants
     *     uint256[] shares
     *     bytes     signature
     *   ).
     *   See `_place` method.
     */
    function _onReceived(
        address /* operator */,
        address /* from */,
        uint256 _tokenId,
        bytes calldata data
    ) internal override(TokenHolder) {
        (
            uint256 tokenId,
            address seller,
            address asset,
            uint256 price,
            uint256 step,
            uint256 penalty,
            uint256 startTime,
            uint256 endTime,
            uint256 deadline,
            address[] memory participants,
            uint256[] memory shares,
            bytes memory signature
        ) = abi.decode(
                data,
                (
                    uint256,
                    address,
                    address,
                    uint256,
                    uint256,
                    uint256,
                    uint256,
                    uint256,
                    uint256,
                    address[],
                    uint256[],
                    bytes
                )
            );

        if (tokenId != _tokenId) {
            revert AuctionHouseWrongData();
        }

        bytes32 auctionPermitHash = keccak256(
            abi.encode(
                AUCTION_PERMIT_TYPE_HASH,
                tokenId,
                seller,
                address(0), // asset
                price,
                step,
                penalty,
                startTime,
                endTime,
                deadline,
                keccak256(abi.encodePacked(participants)),
                keccak256(abi.encodePacked(shares))
            )
        );

        _validateSignature(AUCTION_SIGNER, auctionPermitHash, deadline, signature);

        _crate(
            tokenId,
            seller,
            asset,
            price,
            step,
            penalty,
            startTime,
            endTime,
            participants,
            shares
            //
        );
    }

    function _useAuctionId() private returns (uint256) {
        AuctionHouseStorage.Layout storage $ = AuctionHouseStorage.layout();

        return $.auctionsCount++;
    }

    function _requireExist(uint256 auctionId) private view {
        AuctionHouseStorage.Layout storage $ = AuctionHouseStorage.layout();

        if (!(auctionId < $.auctionsCount)) {
            revert AuctionHouseAuctionNotExist(auctionId);
        }
    }
}
