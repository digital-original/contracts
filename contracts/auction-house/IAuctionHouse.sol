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
        uint256 price;
        uint256 fee;
        uint256 step;
        uint256 endTime;
        address buyer;
        bool sold;
        string tokenURI;
        address[] participants;
        uint256[] shares;
    }

    /**
     * @dev Triggered when auction was placed.
     */
    event Created(uint256 indexed auctionId, uint256 indexed tokenId, uint256 price, uint256 endTime);

    /**
     * @dev Triggered when auction price was raised.
     */
    event Raised(uint256 indexed auctionId, address indexed buyer, uint256 price);

    /**
     * @dev Triggered when auction was sold.
     */
    event Sold(uint256 indexed auctionId);

    struct CreateParams {
        uint256 auctionId;
        uint256 tokenId;
        string tokenURI;
        uint256 price;
        uint256 fee;
        uint256 step;
        uint256 endTime;
        address[] participants;
        uint256[] shares;
        bytes signature;
        uint256 deadline;
    }

    function create(CreateParams calldata params) external;

    function raiseInitial(uint256 auctionId, uint256 price) external;

    function raise(uint256 auctionId, uint256 price) external;

    function finish(uint256 auctionId) external;

    function auction(uint256 auctionId) external view returns (Auction memory);

    error AuctionHouseInvalidEndTime(uint256 currentTime, uint256 givenTime);

    error AuctionHouseBuyerExists(uint256 auctionId, address buyer);
    error AuctionHouseBuyerNotExists(uint256 auctionId);
    error AuctionHouseAuctionExists(uint256 auctionId);
    error AuctionHouseAuctionNotExist(uint256 auctionId);
    error AuctionHouseAuctionEnded(uint256 auctionId, uint256 currentTime, uint256 endTime);
    error AuctionHouseAuctionNotEnded(uint256 auctionId, uint256 currentTime, uint256 endTime);
    error AuctionHouseAuctionSold(uint256 auctionId);

    error AuctionHouseRaiseTooSmall(uint256 minNeededAmount, uint256 givenAmount);
}
