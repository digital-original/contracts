// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.20;

import {EIP712Domain} from "../utils/EIP712Domain.sol";
import {RoleSystem} from "../utils/role-system/RoleSystem.sol";
import {Authorization} from "../utils/Authorization.sol";
import {CurrencyManager} from "../utils/currency-manager/CurrencyManager.sol";
import {CurrencyTransfers} from "../utils/CurrencyTransfers.sol";
import {TokenConfig} from "../utils/TokenConfig.sol";
import {Roles} from "../utils/Roles.sol";
import {IArtToken} from "../art-token/IArtToken.sol";
import {ShareUtils} from "./libraries/ShareUtils.sol";
import {AuctionCreationPermit} from "./libraries/AuctionCreationPermit.sol";
import {Auction} from "./libraries/Auction.sol";
import {AuctionHouseStorage} from "./AuctionHouseStorage.sol";
import {IAuctionHouse} from "./IAuctionHouse.sol";

/**
 * @title AuctionHouse
 * @notice Upgradeable English-auction contract that conducts primary sales for NFTs minted by
 *         {ArtToken}. Users create auctions via an authorized EIP-712 permit, place bids and,
 *         after the auction ends, the highest bidder receives the token while funds are
 *         split between participants and the protocol treasury.
 */
contract AuctionHouse is
    IAuctionHouse,
    EIP712Domain,
    RoleSystem,
    Authorization,
    CurrencyManager,
    CurrencyTransfers
{
    using TokenConfig for TokenConfig.Type;
    using AuctionCreationPermit for AuctionCreationPermit.Type;

    /// @notice Address of the associated {ArtToken} contract.
    IArtToken public immutable ART_TOKEN;

    /// @notice Minimum auction duration configured at deployment.
    uint256 public immutable MIN_DURATION;

    /// @notice Hard-coded upper bound for auction duration (21 days).
    uint256 public constant MAX_DURATION = 21 days;

    /// @notice Ensures that an auction with `auctionId` exists, reverts otherwise.
    modifier auctionExists(uint256 auctionId) {
        if (!_auctionExists(auctionId)) {
            revert AuctionHouseNonexistentAuction();
        }
        _;
    }

    /// @notice Ensures that no auction with `auctionId` exists yet, reverts otherwise.
    modifier auctionDoesNotExist(uint256 auctionId) {
        if (_auctionExists(auctionId)) {
            revert AuctionHouseAuctionAlreadyExists();
        }
        _;
    }

    /// @notice Ensures the auction has passed its `endTime`, reverts otherwise.
    modifier auctionEnded(uint256 auctionId) {
        if (!_auctionEnded(auctionId)) {
            revert AuctionHouseAuctionNotEnded();
        }
        _;
    }

    /// @notice Ensures the auction is still active (not ended), reverts otherwise.
    modifier auctionNotEnded(uint256 auctionId) {
        if (_auctionEnded(auctionId)) {
            revert AuctionHouseAuctionAlreadyEnded();
        }
        _;
    }

    /// @notice Ensures the auction already has a highest bidder recorded, reverts otherwise.
    modifier auctionWithBuyer(uint256 auctionId) {
        if (!_auctionWithBuyer(auctionId)) {
            revert AuctionHouseMissingBuyer();
        }
        _;
    }

    /// @notice Ensures the auction currently has no buyer, reverts otherwise.
    modifier auctionWithoutBuyer(uint256 auctionId) {
        if (_auctionWithBuyer(auctionId)) {
            revert AuctionHouseUnexpectedBuyer();
        }
        _;
    }

    /// @notice Ensures the caller is compliant with the {ArtToken} contract, reverts otherwise.
    modifier onlyCompliantAccount(address account) {
        if (!ART_TOKEN.accountCompliant(account)) {
            revert AuctionHouseUnauthorizedAccount(account);
        }
        _;
    }

    /**
     * @notice Initializes the implementation with the given immutable parameters.
     * @param proxy Address of the proxy that will ultimately own the implementation
     *              (used for EIP-712 domain separator).
     * @param main Address that will be set as {RoleSystem.MAIN}.
     * @param wrappedEther Address of the Wrapped Ether contract.
     * @param artToken Address of the associated {ArtToken} contract.
     * @param minAuctionDuration Minimum duration for auctions, in seconds.
     */
    constructor(
        address proxy,
        address main,
        address wrappedEther,
        address artToken,
        uint256 minAuctionDuration
    ) EIP712Domain(proxy, "AuctionHouse", "1") RoleSystem(main) CurrencyTransfers(wrappedEther) {
        if (artToken == address(0)) revert AuctionHouseMisconfiguration(2);
        if (minAuctionDuration == 0) revert AuctionHouseMisconfiguration(3);

        ART_TOKEN = IArtToken(artToken);
        MIN_DURATION = minAuctionDuration;
    }

    /**
     * @notice Creates a new auction for a token that has not yet been minted. The auction details are
     *         specified in the `permit`, which is signed by an authorized auction-house signer.
     * @param permit The `AuctionCreationPermit` struct containing the auction details.
     * @param permitSignature The EIP-712 signature of the `permit`, signed by the auction-house signer.
     */
    function create(
        AuctionCreationPermit.Type calldata permit,
        bytes calldata permitSignature
    ) external auctionDoesNotExist(permit.auctionId) {
        AuctionHouseStorage.Layout storage $ = AuctionHouseStorage.layout();

        _requireAuthorizedAction(permit.hash(), permit.deadline, permitSignature);

        permit.tokenConfig.requirePopulated();

        if (permit.price == 0) {
            revert AuctionHouseZeroPrice();
        }

        if (permit.step == 0) {
            revert AuctionHouseZeroStep();
        }

        if (permit.endTime < block.timestamp + MIN_DURATION) {
            revert AuctionHouseInvalidEndTime();
        }

        if (permit.endTime > block.timestamp + MAX_DURATION) {
            revert AuctionHouseInvalidEndTime();
        }

        if (!_currencyAllowed(permit.currency)) {
            revert AuctionHouseUnsupportedCurrency();
        }

        if (_tokenReserved(permit.tokenId)) {
            revert AuctionHouseTokenAlreadyReserved($.tokenAuctionId[permit.tokenId]);
        }

        if (ART_TOKEN.tokenExists(permit.tokenId)) {
            revert AuctionHouseTokenAlreadyMinted();
        }

        ShareUtils.requireValidConditions(permit.participants, permit.shares);

        $.auction[permit.auctionId] = Auction.Type({
            tokenId: permit.tokenId,
            price: permit.price,
            fee: permit.fee,
            step: permit.step,
            endTime: permit.endTime,
            buyer: address(0),
            sold: false,
            tokenURI: permit.tokenURI,
            participants: permit.participants,
            shares: permit.shares,
            currency: permit.currency
        });

        $.tokenAuctionId[permit.tokenId] = permit.auctionId;

        $.tokenConfig[permit.tokenId] = permit.tokenConfig;

        emit Created(permit.auctionId, permit.tokenId, permit.price, permit.endTime);
    }

    /**
     * @notice Places the first bid on an auction, which must be at least the starting price.
     * @param auctionId The ID of the auction to bid on.
     * @param newPrice The amount of the bid, which must be at least the starting price.
     */
    function raiseInitial(
        uint256 auctionId,
        uint256 newPrice
    )
        external
        payable
        onlyCompliantAccount(msg.sender)
        auctionExists(auctionId)
        auctionNotEnded(auctionId)
        auctionWithoutBuyer(auctionId)
    {
        AuctionHouseStorage.Layout storage $ = AuctionHouseStorage.layout();
        Auction.Type storage _auction = $.auction[auctionId];

        if (newPrice < _auction.price) {
            revert AuctionHouseRaiseTooLow(_auction.price);
        }

        _auction.buyer = msg.sender;
        _auction.price = newPrice;

        emit Raised(auctionId, msg.sender, newPrice);

        _receiveCurrency(_auction.currency, msg.sender, newPrice + _auction.fee);
    }

    /**
     * @notice Raises the current highest bid on an auction. The new bid must be at least the sum of the
     *         current highest bid and the minimum step increment.
     * @dev when a new bid is placed, the previous highest bidder is refunded.
     * @param auctionId The ID of the auction to bid on.
     * @param newPrice The amount of the new bid, which must be at least the sum of the current highest
     *                 bid and the minimum step increment.
     */
    function raise(
        uint256 auctionId,
        uint256 newPrice
    )
        external
        payable
        onlyCompliantAccount(msg.sender)
        auctionExists(auctionId)
        auctionNotEnded(auctionId)
        auctionWithBuyer(auctionId)
    {
        AuctionHouseStorage.Layout storage $ = AuctionHouseStorage.layout();
        Auction.Type storage _auction = $.auction[auctionId];

        uint256 oldPrice = _auction.price;
        address oldBuyer = _auction.buyer;
        uint256 fee = _auction.fee;
        address currency = _auction.currency;

        if (newPrice < oldPrice + _auction.step) {
            revert AuctionHouseRaiseTooLow(oldPrice + _auction.step);
        }

        _auction.price = newPrice;
        _auction.buyer = msg.sender;

        emit Raised(auctionId, msg.sender, newPrice);

        _receiveCurrency(currency, msg.sender, newPrice + fee);

        _sendCurrency(currency, oldBuyer, oldPrice + fee);
    }

    /**
     * @notice Finalizes an auction that has ended, transferring the token to the buyer and distributing
     *         the revenue.
     * @param auctionId The ID of the auction to finalize.
     */
    function finish(
        uint256 auctionId
    ) external auctionExists(auctionId) auctionEnded(auctionId) auctionWithBuyer(auctionId) {
        AuctionHouseStorage.Layout storage $ = AuctionHouseStorage.layout();
        Auction.Type storage _auction = $.auction[auctionId];

        if (_auction.sold) {
            revert AuctionHouseTokenAlreadySold();
        }

        _auction.sold = true;

        emit Sold(auctionId);

        address currency = _auction.currency;
        uint256 price = _auction.price;

        _sendCurrency(currency, _uniqueRoleOwner(Roles.FINANCIAL_ROLE), _auction.fee);

        _sendCurrencyBatch(
            currency,
            price,
            _auction.participants,
            ShareUtils.calculateRewards(price, _auction.shares)
        );

        uint256 tokenId = _auction.tokenId;

        ART_TOKEN.safeMintFromAuctionHouse(
            _auction.buyer,
            tokenId,
            _auction.tokenURI,
            $.tokenConfig[tokenId]
        );
    }

    /**
     * @notice Cancels an active auction.
     * @dev An auction can only be cancelled if there are no bids yet.
     *      Can only be called by an account with the `ADMIN_ROLE`.
     *      The function marks the auction as ended by setting its `endTime` to the current block timestamp.
     * @param auctionId The ID of the auction to cancel.
     */
    function cancel(
        uint256 auctionId
    )
        external
        auctionExists(auctionId)
        auctionNotEnded(auctionId)
        auctionWithoutBuyer(auctionId)
        onlyRole(Roles.ADMIN_ROLE)
    {
        AuctionHouseStorage.Layout storage $ = AuctionHouseStorage.layout();

        // Mark the auction as ended by setting endTime to current timestamp
        $.auction[auctionId].endTime = block.timestamp;

        emit Cancelled(auctionId);
    }

    /**
     * @notice Returns the full auction struct for `auctionId`.
     * @param auctionId The ID of the auction to retrieve.
     */
    function auction(uint256 auctionId) external view auctionExists(auctionId) returns (Auction.Type memory) {
        AuctionHouseStorage.Layout storage $ = AuctionHouseStorage.layout();

        return $.auction[auctionId];
    }

    /**
     * @notice Indicates whether any active auction has reserved `tokenId` for future minting.
     * @param tokenId The ID of the token to check.
     * @return reserved True if the token is currently locked by an active auction.
     */
    function tokenReserved(uint256 tokenId) external view returns (bool reserved) {
        return _tokenReserved(tokenId);
    }

    /**
     * @notice Internal helper that indicates whether any active auction has reserved `tokenId`
     *         for future minting.
     * @param tokenId The ID of the token to check.
     * @return reserved True if the token is reserved.
     */
    function _tokenReserved(uint256 tokenId) internal view returns (bool reserved) {
        AuctionHouseStorage.Layout storage $ = AuctionHouseStorage.layout();

        uint256 auctionId = $.tokenAuctionId[tokenId];

        if (!_auctionExists(auctionId)) {
            // The auction does not exist
            return false;
        }

        if (!_auctionEnded(auctionId)) {
            // The auction has not ended
            return true;
        }

        if ($.auction[auctionId].sold) {
            // The auction has been sold (token minted)
            return false;
        }

        if (_auctionWithBuyer(auctionId)) {
            // The auction has a buyer (token not minted yet but reserved for that buyer)
            return true;
        }

        // The auction has ended without a buyer
        return false;
    }

    /**
     * @notice Internal helper that returns true if `auctionId`'s `endTime` is in the past.
     * @param auctionId The ID of the auction to check.
     * @return bool True if the auction has ended.
     */
    function _auctionEnded(uint256 auctionId) private view returns (bool) {
        AuctionHouseStorage.Layout storage $ = AuctionHouseStorage.layout();

        return $.auction[auctionId].endTime <= block.timestamp;
    }

    /**
     * @notice Internal helper that checks whether an auction struct has been populated.
     * @param auctionId The ID of the auction to check.
     * @return bool True if the auction exists.
     */
    function _auctionExists(uint256 auctionId) private view returns (bool) {
        AuctionHouseStorage.Layout storage $ = AuctionHouseStorage.layout();

        return $.auction[auctionId].endTime != 0;
    }

    /**
     * @notice Internal helper that returns true when an auction has a non-zero buyer.
     * @param auctionId The ID of the auction to check.
     * @return bool True if the auction has a buyer.
     */
    function _auctionWithBuyer(uint256 auctionId) private view returns (bool) {
        AuctionHouseStorage.Layout storage $ = AuctionHouseStorage.layout();

        return $.auction[auctionId].buyer != address(0);
    }
}

/**
 * -------------------------------------------------------------------------
 *               AuctionHouse State Machine Specification
 * -------------------------------------------------------------------------
 *
 * This document describes the implicit state machine governing each auction.
 *
 * The contract does not use an explicit enum to represent auction states.
 * Instead, the state of an auction is derived from the combination of:
 *
 * - `endTime`
 * - `buyer`
 * - `sold`
 *
 * Each auction deterministically transitions between the states described below.
 *
 * -------------------------------------------------------------------------
 * STATE DEFINITIONS
 * -------------------------------------------------------------------------
 *
 * -------------------------------------------------------------------------
 * 0. Nonexistent
 * -------------------------------------------------------------------------
 *
 * Conditions:
 *   - auction.endTime == 0
 *
 * Description:
 *   The auction has not been created.
 *
 * Allowed actions:
 *   - create()
 *
 * Disallowed actions:
 *   - raiseInitial()
 *   - raise()
 *   - finish()
 *   - cancel()
 *
 * -------------------------------------------------------------------------
 * 1. Active (No Bids)
 * -------------------------------------------------------------------------
 *
 * Conditions:
 *   - auction.endTime > block.timestamp
 *   - auction.buyer == address(0)
 *   - auction.sold == false
 *
 * Description:
 *   The auction exists and is currently active.
 *   No bids have been placed yet.
 *
 * Allowed actions:
 *   - raiseInitial()
 *   - cancel()  (ADMIN_ROLE only)
 *
 * Disallowed actions:
 *   - raise()
 *   - finish()
 *
 * Transitions:
 *   - raiseInitial()  → Active (Has Bids)
 *   - cancel()        → Ended (No Bids)
 *   - time expiration → Ended (No Bids)
 *
 * -------------------------------------------------------------------------
 * 2. Active (Has Bids)
 * -------------------------------------------------------------------------
 *
 * Conditions:
 *   - auction.endTime > block.timestamp
 *   - auction.buyer != address(0)
 *   - auction.sold == false
 *
 * Description:
 *   The auction is active and has a current highest bidder.
 *
 * Allowed actions:
 *   - raise()
 *
 * Disallowed actions:
 *   - raiseInitial()
 *   - cancel()
 *   - finish()
 *
 * Transitions:
 *   - raise()          → remains Active (Has Bids)
 *   - time expiration  → Ended (Has Bids)
 *
 * -------------------------------------------------------------------------
 * 3. Ended (No Bids)
 * -------------------------------------------------------------------------
 *
 * Conditions:
 *   - auction.endTime <= block.timestamp
 *   - auction.buyer == address(0)
 *   - auction.sold == false
 *
 * Description:
 *   The auction ended without any bids.
 *   No token is minted and no funds are distributed.
 *
 * Allowed actions:
 *   - none
 *
 * Token reservation behavior:
 *   - tokenReserved(tokenId) returns false
 *   - the token may be reused in a future auction
 *
 * -------------------------------------------------------------------------
 * 4. Ended (Has Bids, Not Settled)
 * -------------------------------------------------------------------------
 *
 * Conditions:
 *   - auction.endTime <= block.timestamp
 *   - auction.buyer != address(0)
 *   - auction.sold == false
 *
 * Description:
 *   The auction has ended and a winner exists,
 *   but settlement has not yet been executed.
 *
 * Allowed actions:
 *   - finish()
 *
 * Disallowed actions:
 *   - raiseInitial()
 *   - raise()
 *   - cancel()
 *
 * Transitions:
 *   - finish() → Settled
 *
 * Token reservation behavior:
 *   - tokenReserved(tokenId) returns true
 *   - token remains reserved until settlement
 *
 * -------------------------------------------------------------------------
 * 5. Settled (Final State)
 * -------------------------------------------------------------------------
 *
 * Conditions:
 *   - auction.sold == true
 *
 * Description:
 *   The auction has been finalized:
 *     - the NFT is minted to the winner
 *     - the protocol fee is transferred
 *     - proceeds are distributed to participants
 *
 * This is a terminal state.
 *
 * Allowed actions:
 *   - none
 *
 * Token reservation behavior:
 *   - tokenReserved(tokenId) returns false
 *   - token is permanently minted and no longer reservable
 *
 */
