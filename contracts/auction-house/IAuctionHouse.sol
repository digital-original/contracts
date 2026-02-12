// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.20;

import {Auction} from "./libraries/Auction.sol";
import {AuctionCreationPermit} from "./libraries/AuctionCreationPermit.sol";

/**
 * @title IAuctionHouse
 *
 * @notice Interface for the protocol's English-auction module responsible for primary NFT sales.
 *         Allows creating auctions, placing bids (raises), and finalizing sales with revenue
 *         distribution.
 */
interface IAuctionHouse {
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
     *
     * @param auctionId Identifier of the auction that was sold.
     */
    event Sold(uint256 indexed auctionId);

    /**
     * @notice Emitted when an auction is cancelled.
     *
     * @param auctionId Identifier of the auction that was cancelled.
     */
    event Cancelled(uint256 indexed auctionId);

    /**
     * @notice Creates a new auction with parameters validated and authorized via
     *         an EIP-712 signature.
     *
     * @param permit The `AuctionCreationPermit` struct containing the auction details.
     * @param permitSignature The EIP-712 signature of the `permit`, signed by the auction-house signer.
     */
    function create(AuctionCreationPermit.Type calldata permit, bytes calldata permitSignature) external;

    /**
     * @notice Places the first bid on an auction that has no current bidder.
     */
    function raiseInitial(uint256 auctionId, uint256 newPrice) external payable;

    /**
     * @notice Places a bid higher than the current highest bid by at least `step`.
     */
    function raise(uint256 auctionId, uint256 newPrice) external payable;

    /**
     * @notice Finalizes the auction, mints the token to the highest bidder
     *         and distributes proceeds.
     */
    function finish(uint256 auctionId) external;

    /**
     * @notice Cancels an auction.
     */
    function cancel(uint256 auctionId) external;

    /**
     * @notice Returns the full auction struct for `auctionId`.
     *
     * @param auctionId The ID of the auction to retrieve.
     */
    function auction(uint256 auctionId) external view returns (Auction.Type memory);

    /**
     * @notice Indicates whether any active auction has reserved `tokenId`.
     *
     * @param tokenId The ID of the token to check.
     *
     * @return reserved True if the token is currently locked by an active auction or an ended
     *                  auction with a buyer.
     */
    function tokenReserved(uint256 tokenId) external view returns (bool reserved);

    /// @dev Thrown when an action is attempted by an unauthorized account.
    error AuctionHouseUnauthorizedAccount(address account);

    /// @dev Thrown when `price` provided is below minimum allowed.
    error AuctionHouseInvalidPrice();

    /// @dev Thrown when `fee` provided is below minimum allowed.
    error AuctionHouseInvalidFee();

    /// @dev Thrown when `step` parameter is zero.
    error AuctionHouseInvalidStep();

    /// @dev Thrown when `endTime` is outside the permitted window.
    error AuctionHouseInvalidEndTime();

    /// @dev Thrown when a currency is invalid.
    error AuctionHouseInvalidCurrency();

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
    error AuctionHouseMisconfiguration(uint8 argIndex);
}
