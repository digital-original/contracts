// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/**
 * @title IAuction.
 *
 * @notice Auction contract interface.
 * @notice Auction contract provides logic for creating auction with ERC721 tokens.
 */
interface IAuctionHouse {
    /**
     * @dev Auction auction struct
     */
    struct Auction {
        uint256 tokenId;
        address seller;
        address buyer;
        uint256 price;
        uint256 step;
        uint256 penalty;
        uint256 fee;
        uint256 startTime;
        uint256 endTime;
        bool completed;
        address[] participants;
        uint256[] shares;
    }

    /**
     * @dev Triggered when auction was placed.
     */
    event Created(
        uint256 indexed auctionId,
        uint256 indexed tokenId,
        address indexed seller,
        uint256 price,
        uint256 step,
        uint256 startTime,
        uint256 endTime
    );

    /**
     * @dev Triggered when auction price was raised.
     */
    event Raised(uint256 indexed auctionId, address indexed buyer, uint256 price);

    /**
     * @dev Triggered when auction was completed.
     */
    event Completed(uint256 indexed auctionId, CompletionWay way);

    enum CompletionWay {
        Taken,
        Bought,
        Unlocked
    }

    function raise(
        uint256 auctionId,
        uint256 price,
        uint256 fee,
        uint256 deadline,
        bool initial,
        bytes memory signature
    ) external payable;

    function raise(
        uint256 auctionId,
        uint256 price,
        uint256 fee,
        uint256 deadline,
        bytes memory signature
    ) external payable;

    function take(uint256 auctionId) external payable;

    function buy(uint256 auctionId) external payable;

    function unlock(uint256 auctionId) external payable;

    function auctionsCount() external view returns (uint256 count);

    function auction(uint256 auctionId) external view returns (Auction memory);

    error AuctionHouseWrongData();

    error AuctionHouseInvalidStartTime(uint256 startTime, uint256 endTime);
    error AuctionHouseInvalidEndTime(uint256 endTime, uint256 currentTime);

    error AuctionHouseBuyerExists(address buyer);
    error AuctionHouseBuyerNotExists();

    error AuctionHouseAuctionNotExist(uint256 auctionId);
    error AuctionHouseAuctionNotStarted(uint256 startTime);
    error AuctionHouseAuctionEnded(uint256 endTime);
    error AuctionHouseAuctionNotEnded(uint256 endTime);
    error AuctionHouseAuctionCompleted();

    error AuctionHouseRaiseTooSmall(uint256 received, uint256 min);
    error AuctionHouseWrongPayment(uint256 received, uint256 needed);
}
