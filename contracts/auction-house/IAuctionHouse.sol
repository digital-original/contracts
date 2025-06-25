// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.20;

/**
 * @title IAuctionHouse
 *
 * @notice Interface for the protocol's English-auction module responsible for primary NFT sales.
 *         Allows creating auctions, placing bids (raises), and finalizing sales with revenue
 *         distribution.
 */
interface IAuctionHouse {
    /**
     * @notice In-memory representation of an auction.
     *
     * @param tokenId Identifier of the token being sold.
     * @param price Current highest bid (or starting price).
     * @param fee Platform fee that will be added to the final payment.
     * @param step Minimum raise step expressed in settlement-token units.
     * @param endTime UNIX timestamp after which the auction can be finalized.
     * @param buyer Current highest bidder.
     * @param sold Flag indicating whether `finish` has been called.
     * @param tokenURI Metadata URI for lazy-minting upon settlement.
     * @param participants Revenue-sharing recipients.
     * @param shares Number of shares assigned to each participant.
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
     * @notice Parameters accepted by {create}.
     *
     * @param auctionId Unique identifier chosen by the caller.
     * @param tokenId Identifier of the token that will be minted/sold.
     * @param tokenURI Metadata URI.
     * @param price Starting price.
     * @param fee Platform fee.
     * @param step Minimum raise increment.
     * @param endTime Auction end timestamp.
     * @param participants Revenue-sharing recipients.
     * @param shares Shares for each participant.
     * @param signature EIP-712 signature issued by the auction-house signer authorizing the
     *                  auction.
     * @param deadline Expiration timestamp for the signature.
     */
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

    /**
     * @notice Emitted after a successful call to {create}.
     *
     * @param auctionId Identifier of the newly created auction.
     * @param tokenId Token identifier associated with the auction.
     * @param price Starting price.
     * @param endTime Auction end timestamp.
     */
    event Created(uint256 indexed auctionId, uint256 indexed tokenId, uint256 price, uint256 endTime);

    /**
     * @notice Emitted each time a new highest bid is placed.
     *
     * @param auctionId Identifier of the auction.
     * @param buyer Address of the bidder.
     * @param price New highest bid.
     */
    event Raised(uint256 indexed auctionId, address indexed buyer, uint256 price);

    /**
     * @notice Emitted when {finish} successfully settles the auction.
     */
    event Sold(uint256 indexed auctionId);

    /**
     * @notice Creates a new auction with parameters validated and authorized via
     *         an EIP-712 signature.
     */
    function create(CreateParams calldata params) external;

    /**
     * @notice Places the first bid on an auction that has no current bidder.
     */
    function raiseInitial(uint256 auctionId, uint256 price) external;

    /**
     * @notice Places a bid higher than the current highest bid by at least `step`.
     */
    function raise(uint256 auctionId, uint256 price) external;

    /**
     * @notice Finalizes the auction, mints the token to the highest bidder
     *         and distributes proceeds.
     */
    function finish(uint256 auctionId) external;

    /**
     * @notice Returns the full auction struct for `auctionId`.
     */
    function auction(uint256 auctionId) external view returns (Auction memory);

    /**
     * @notice Indicates whether any active auction has reserved `tokenId`.
     */
    function tokenReserved(uint256 tokenId) external view returns (bool reserved);

    /// @dev Thrown when an action is attempted by an unauthorized account.
    error AuctionHouseUnauthorizedAccount(address account);

    /// @dev Thrown when an empty string is supplied as `tokenURI`.
    error AuctionHouseEmptyTokenURI();

    /// @dev Thrown when `price` provided is below minimum allowed.
    error AuctionHouseInvalidPrice();

    /// @dev Thrown when `fee` provided is below minimum allowed.
    error AuctionHouseInvalidFee();

    /// @dev Thrown when `step` parameter is zero.
    error AuctionHouseInvalidStep();

    /// @dev Thrown when `endTime` is outside the permitted window.
    error AuctionHouseInvalidEndTime();

    /// @dev Thrown when the token is already reserved by an auction.
    error AuctionHouseTokenReserved();

    /// @dev Thrown when trying to set a buyer but one already exists.
    error AuctionHouseBuyerExists();

    /// @dev Thrown when expected buyer does not exist.
    error AuctionHouseBuyerNotExists();

    /// @dev Thrown when creating an auction that already exists.
    error AuctionHouseAuctionExists();

    /// @dev Thrown when referencing a non-existent auction.
    error AuctionHouseAuctionNotExists();

    /// @dev Thrown when the auction has already ended.
    error AuctionHouseAuctionEnded();

    /// @dev Thrown when the auction has not yet ended.
    error AuctionHouseAuctionNotEnded();

    /// @dev Thrown when attempting to finish an auction whose token is already sold.
    error AuctionHouseTokenSold();

    /// @dev Thrown when a raise is below the minimum increment.
    error AuctionHouseRaiseTooLow(uint256 minAmount);

    /// @dev Thrown when constructor argument at `argIndex` is invalid.
    error AuctionHouseMisconfiguration(uint256 argIndex);
}
