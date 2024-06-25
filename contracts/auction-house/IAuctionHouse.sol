// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/**
 * @title IAuctionHouse.
 *
 * @notice AuctionHouse contract interface.
 */
interface IAuctionHouse {
    /**
     * @dev Auction storage struct.
     */
    struct Auction {
        uint256 tokenId; // Token ID
        uint256 price; // Token price
        uint256 fee; // Platform fee
        uint256 step; // Price step
        uint256 endTime; // Auction end time
        address buyer; // Token buyer
        bool sold; // Indicator of whether token has been sold
        string tokenURI; // Token URI
        address[] participants; // Participants for reward distribution
        uint256[] shares; // Shares for reward distribution
    }

    /**
     * @dev Triggered when the auction was created.
     */
    event Created(uint256 indexed auctionId, uint256 indexed tokenId, uint256 price, uint256 endTime);

    /**
     * @dev Triggered when the token price was raised.
     */
    event Raised(uint256 indexed auctionId, address indexed buyer, uint256 price);

    /**
     * @dev Triggered when the token was sold.
     */
    event Sold(uint256 indexed auctionId);

    /**
     * @dev Parameters for `create` method.
     */
    struct CreateParams {
        uint256 auctionId; // Auction ID
        uint256 tokenId; // Token ID
        string tokenURI; // Token URI
        uint256 price; // Token initial price
        uint256 fee; // Platform fee
        uint256 step; // Price step
        uint256 endTime; // Auction end time
        address[] participants; // Participants for reward distribution
        uint256[] shares; // Shares for reward distribution
        bytes signature; // Permit signed by Admin
        uint256 deadline; // Signature expiration deadline in seconds
    }

    /**
     * @notice Creates a new auction.
     */
    function create(CreateParams calldata params) external;

    /**
     * @notice Raises token price for auction without previous bids.
     */
    function raiseInitial(uint256 auctionId, uint256 price) external;

    /**
     * @notice Raises token price for auction with previous bids.
     */
    function raise(uint256 auctionId, uint256 price) external;

    /**
     * @notice Mints a new token for a buyer and distributes rewards.
     */
    function finish(uint256 auctionId) external;

    /**
     * @notice Returns auction.
     */
    function auction(uint256 auctionId) external view returns (Auction memory);

    /**
     * @dev Returns true if an auction has reserved the token.
     */
    function tokenReserved(uint256 tokenId) external view returns (bool);

    /**
     * @dev The token uri is an empty string.
     */
    error AuctionHouseEmptyTokenURI();

    /**
     * @dev The price is less than min value.
     */
    error AuctionHouseInvalidPrice(uint256 value);

    /**
     * @dev The fee is less than min value.
     */
    error AuctionHouseInvalidFee(uint256 value);

    /**
     * @dev The step is zero.
     */
    error AuctionHouseInvalidStep();

    /**
     * @dev The auction end time is less than block time.
     */
    error AuctionHouseInvalidEndTime(uint256 endTime, uint256 blockTime);

    /**
     * @dev The token is reserved.
     */
    error AuctionHouseTokenReserved(uint256 tokenId);

    /**
     * @dev The auction id is zero.
     */
    error AuctionHouseZeroId();

    /**
     * @dev The token buyer must not exist.
     */
    error AuctionHouseBuyerExists(uint256 auctionId, address buyer);

    /**
     * @dev The token buyer must exist.
     */
    error AuctionHouseBuyerNotExists(uint256 auctionId);

    /**
     * @dev The token buyer is invalid.
     */
    error AuctionHouseInvalidBuyer(address buyer);

    /**
     * @dev The auction already exists.
     */
    error AuctionHouseAuctionExists(uint256 auctionId);

    /**
     * @dev The auction does not exist.
     */
    error AuctionHouseAuctionNotExist(uint256 auctionId);

    /**
     * @dev The auction has already ended.
     */
    error AuctionHouseAuctionEnded(uint256 auctionId, uint256 endTime, uint256 blockTime);

    /**
     * @dev The auction has not yet ended.
     */
    error AuctionHouseAuctionNotEnded(uint256 auctionId, uint256 endTime, uint256 blockTime);

    /**
     * @dev The token for the auction has already been sold.
     */
    error AuctionHouseTokenSold(uint256 auctionId);

    /**
     * @dev The raise amount is less than minimum raise amount.
     */
    error AuctionHouseRaiseTooSmall(uint256 amount, uint256 minAmount);

    /**
     * @dev The constructor parameter number `paramNumber` is invalid.
     */
    error AuctionHouseMisconfiguration(uint256 paramNumber);
}
