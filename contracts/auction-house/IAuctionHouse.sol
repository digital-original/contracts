// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.20;

import {Auction} from "./libraries/Auction.sol";
import {AuctionCreationPermit} from "./libraries/AuctionCreationPermit.sol";

/**
 * @title IAuctionHouse
 * @notice Interface for the protocol's English-auction module responsible for primary NFT sales.
 *         Allows creating auctions, placing bids (raises), and finalizing sales with revenue
 *         distribution.
 */
interface IAuctionHouse {
    /**
     * @notice Emitted when a new auction is created.
     * @param auctionId Identifier of the newly created auction.
     * @param tokenId Token identifier associated with the auction.
     * @param price Starting price.
     * @param endTime Auction end timestamp.
     */
    event Created(uint256 indexed auctionId, uint256 indexed tokenId, uint256 price, uint256 endTime);

    /**
     * @notice Emitted when a new highest bid is placed on an auction.
     * @param auctionId Identifier of the auction.
     * @param buyer Address of the bidder.
     * @param price New highest bid.
     */
    event Raised(uint256 indexed auctionId, address indexed buyer, uint256 price);

    /**
     * @notice Emitted when an auction is finalized with a sale.
     * @param auctionId Identifier of the auction that was sold.
     */
    event Sold(uint256 indexed auctionId);

    /**
     * @notice Emitted when an auction is cancelled.
     * @param auctionId Identifier of the auction that was cancelled.
     */
    event Cancelled(uint256 indexed auctionId);

    /**
     * @notice Creates a new auction for a token that has not yet been minted. The auction details are
     *         specified in the `permit`, which is signed by an authorized auction-house signer.
     * @param permit The `AuctionCreationPermit` struct containing the auction details.
     * @param permitSignature The EIP-712 signature of the `permit`, signed by the auction-house signer.
     */
    function create(AuctionCreationPermit.Type calldata permit, bytes calldata permitSignature) external;

    /**
     * @notice Places the first bid on an auction, which must be at least the starting price.
     * @param auctionId The ID of the auction to bid on.
     * @param newPrice The amount of the bid, which must be at least the starting price.
     */
    function raiseInitial(uint256 auctionId, uint256 newPrice) external payable;

    /**
     * @notice Raises the current highest bid on an auction. The new bid must be at least the sum of the
     *         current highest bid and the minimum step increment.
     * @dev when a new bid is placed, the previous highest bidder is refunded.
     * @param auctionId The ID of the auction to bid on.
     * @param newPrice The amount of the new bid, which must be at least the sum of the current highest
     *                 bid and the minimum step increment.
     */
    function raise(uint256 auctionId, uint256 newPrice) external payable;

    /**
     * @notice Finalizes an auction that has ended, transferring the token to the buyer and distributing
     *         the revenue.
     * @param auctionId The ID of the auction to finalize.
     */
    function finish(uint256 auctionId) external;

    /**
     * @notice Cancels an active auction.
     * @dev An auction can only be cancelled if there are no bids yet.
     * @param auctionId The ID of the auction to cancel.
     */
    function cancel(uint256 auctionId) external;

    /**
     * @notice Returns the full auction struct for `auctionId`.
     * @param auctionId The ID of the auction to retrieve.
     */
    function auction(uint256 auctionId) external view returns (Auction.Type memory);

    /**
     * @notice Indicates whether any active auction has reserved `tokenId` for future minting.
     * @param tokenId The ID of the token to check.
     * @return reserved True if the token is currently locked by an active auction.
     */
    function tokenReserved(uint256 tokenId) external view returns (bool reserved);

    /// @dev Thrown when an action is attempted by an unauthorized account.
    /// @param account The address of the unauthorized account.
    error AuctionHouseUnauthorizedAccount(address account);

    /// @dev Thrown when the `price` provided is zero.
    error AuctionHouseZeroPrice();

    /// @dev Thrown when the `step` parameter is zero.
    error AuctionHouseZeroStep();

    /// @dev Thrown when the provided `endTime` is outside the permitted time window.
    error AuctionHouseInvalidEndTime();

    /// @dev Thrown when the currency specified is not supported.
    error AuctionHouseUnsupportedCurrency();

    /// @dev Thrown when the token is already reserved by another auction.
    /// @param existingAuctionId The ID of the auction that has reserved the token.
    error AuctionHouseTokenAlreadyReserved(uint256 existingAuctionId);

    /// @dev Thrown when the token has already been minted.
    error AuctionHouseTokenAlreadyMinted();

    /// @dev Thrown when a buyer exists but is not expected.
    error AuctionHouseUnexpectedBuyer();

    /// @dev Thrown when a buyer does not exist but is expected.
    error AuctionHouseMissingBuyer();

    /// @dev Thrown when an auction already exists.
    error AuctionHouseAuctionAlreadyExists();

    /// @dev Thrown when an auction does not exist.
    error AuctionHouseNonexistentAuction();

    /// @dev Thrown when the auction has already ended.
    error AuctionHouseAuctionAlreadyEnded();

    /// @dev Thrown when the auction has not yet ended.
    error AuctionHouseAuctionNotEnded();

    /// @dev Thrown when the token has already been sold.
    error AuctionHouseTokenAlreadySold();

    /// @dev Thrown when the provided bid amount is below the required minimum.
    /// @param minAmount The minimum allowed bid amount.
    error AuctionHouseRaiseTooLow(uint256 minAmount);

    /// @dev Thrown when a constructor argument is invalid.
    /// @param argIndex The index of the invalid constructor argument.
    error AuctionHouseMisconfiguration(uint8 argIndex);
}
