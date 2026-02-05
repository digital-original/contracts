// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.20;

import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {EIP712Domain} from "../utils/EIP712Domain.sol";
import {RoleSystem} from "../utils/role-system/RoleSystem.sol";
import {Authorization} from "../utils/Authorization.sol";
import {ShareDistributor} from "./libraries/ShareDistributor.sol";
import {CurrencyManager} from "../utils/currency-manager/CurrencyManager.sol";
import {Roles} from "../utils/Roles.sol";
import {IArtToken} from "../art-token/IArtToken.sol";
import {AuctionCreationPermit} from "./libraries/AuctionCreationPermit.sol";
import {Auction} from "./libraries/Auction.sol";
import {AuctionHouseStorage} from "./AuctionHouseStorage.sol";
import {IAuctionHouse} from "./IAuctionHouse.sol";

/**
 * @title AuctionHouse
 *
 * @notice Upgradeable English-auction contract that conducts primary sales for NFTs minted by
 *         {ArtToken}. Users create auctions via an authorized EIP-712 permit, place bids in
 *         USDC and, after the auction ends, the highest bidder receives the token while funds are
 *         split between participants and the protocol treasury.
 */
contract AuctionHouse is IAuctionHouse, EIP712Domain, RoleSystem, Authorization, CurrencyManager {
    using AuctionCreationPermit for AuctionCreationPermit.Type;

    /// @notice Address of the associated {ArtToken} contract.
    IArtToken public immutable ART_TOKEN;

    /// @notice Minimum auction duration configured at deployment.
    uint256 public immutable MIN_DURATION;

    /// @notice Hard-coded upper bound for auction duration (21 days).
    uint256 public constant MAX_DURATION = 21 days;

    /// @notice Ensures that an auction with `auctionId` exists.
    /// @dev Reverts with {AuctionHouseAuctionNotExists} otherwise.
    modifier auctionExists(uint256 auctionId) {
        if (_auctionExists(auctionId)) {
            _;
        } else {
            revert AuctionHouseAuctionNotExists();
        }
    }

    /// @notice Ensures that no auction with `auctionId` exists yet.
    /// @dev Reverts with {AuctionHouseAuctionExists} otherwise.
    modifier auctionNotExist(uint256 auctionId) {
        if (_auctionExists(auctionId)) {
            revert AuctionHouseAuctionExists();
        } else {
            _;
        }
    }

    /// @notice Ensures the auction has passed its `endTime`.
    /// @dev Reverts with {AuctionHouseAuctionNotEnded} if still active.
    modifier auctionEnded(uint256 auctionId) {
        if (_auctionEnded(auctionId)) {
            _;
        } else {
            revert AuctionHouseAuctionNotEnded();
        }
    }

    /// @notice Ensures the auction is still active (not ended).
    /// @dev Reverts with {AuctionHouseAuctionEnded} if the auction has ended.
    modifier auctionNotEnded(uint256 auctionId) {
        if (_auctionEnded(auctionId)) {
            revert AuctionHouseAuctionEnded();
        } else {
            _;
        }
    }

    /// @notice Ensures the auction already has a highest bidder recorded.
    /// @dev Reverts with {AuctionHouseBuyerNotExists} otherwise.
    modifier withBuyer(uint256 auctionId) {
        if (_auctionWithBuyer(auctionId)) {
            _;
        } else {
            revert AuctionHouseBuyerNotExists();
        }
    }

    /// @notice Ensures the auction currently has no buyer.
    /// @dev Reverts with {AuctionHouseBuyerExists} if a buyer is present.
    modifier withoutBuyer(uint256 auctionId) {
        if (_auctionWithBuyer(auctionId)) {
            revert AuctionHouseBuyerExists();
        } else {
            _;
        }
    }

    /// @notice Ensures `account` is authorized to receive tokens.
    /// @dev Reverts with {AuctionHouseUnauthorizedAccount} for non-compliant addresses.
    modifier authorizedBuyer(address account) {
        if (ART_TOKEN.recipientAuthorized(account)) {
            _;
        } else {
            revert AuctionHouseUnauthorizedAccount(account);
        }
    }

    /**
     * @notice Contract constructor.
     *
     * @param proxy Proxy address used for EIP-712 verifying contract.
     * @param main Address that will be set as {RoleSystem.MAIN}.
     * @param artToken Address of the {ArtToken} contract.
     * @param minAuctionDuration Minimum auction duration (seconds).
     */
    constructor(
        address proxy,
        address main,
        address artToken,
        uint256 minAuctionDuration
    ) EIP712Domain(proxy, "AuctionHouse", "1") RoleSystem(main) {
        if (artToken == address(0)) revert AuctionHouseMisconfiguration(2);
        if (minAuctionDuration == 0) revert AuctionHouseMisconfiguration(3);

        ART_TOKEN = IArtToken(artToken);
        MIN_DURATION = minAuctionDuration;
    }

    /**
     * @inheritdoc IAuctionHouse
     */
    function create(
        AuctionCreationPermit.Type calldata permit,
        bytes calldata permitSignature
    ) external auctionNotExist(permit.auctionId) {
        _requireAuthorizedAction(permit.hash(), permit.deadline, permitSignature);

        if (permit.price == 0) {
            revert AuctionHouseInvalidPrice();
        }

        if (permit.fee == 0) {
            revert AuctionHouseInvalidFee();
        }

        if (permit.step == 0) {
            revert AuctionHouseInvalidStep();
        }

        if (permit.endTime < block.timestamp + MIN_DURATION) {
            revert AuctionHouseInvalidEndTime();
        }

        if (permit.endTime > block.timestamp + MAX_DURATION) {
            revert AuctionHouseInvalidEndTime();
        }

        if (!currencyAllowed(permit.currency)) {
            revert AuctionHouseInvalidCurrency();
        }

        if (tokenReserved(permit.tokenId)) {
            revert AuctionHouseTokenReserved();
        }

        if (ART_TOKEN.tokenReserved(permit.tokenId)) {
            revert AuctionHouseTokenReserved();
        }

        ShareDistributor.requireValidConditions(permit.participants, permit.shares);

        AuctionHouseStorage.Layout storage $ = AuctionHouseStorage.layout();

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
     * @inheritdoc IAuctionHouse
     *
     * @dev First bid path. The function:
     *   - Checks caller authorization via {authorizedBuyer}.
     *   - Transfers `newPrice + fee` USDC from the caller to the contract.
     *   - Stores the caller as `buyer` and `newPrice` as `price`.
     *   - Emits {Raised}.
     *
     * Reverts with {AuctionHouseRaiseTooLow} if `newPrice < initial price`.
     *
     * @param auctionId Identifier of the auction that has no current buyer.
     * @param newPrice First bid amount in USDC.
     */
    function raiseInitial(
        uint256 auctionId,
        uint256 newPrice
    )
        external
        payable
        authorizedBuyer(msg.sender)
        auctionExists(auctionId)
        auctionNotEnded(auctionId)
        withoutBuyer(auctionId)
    {
        AuctionHouseStorage.Layout storage $ = AuctionHouseStorage.layout();

        if (newPrice < $.auction[auctionId].price) {
            revert AuctionHouseRaiseTooLow($.auction[auctionId].price);
        }

        $.auction[auctionId].buyer = msg.sender;
        $.auction[auctionId].price = newPrice;

        emit Raised(auctionId, msg.sender, newPrice);

        SafeERC20.safeTransferFrom(
            IERC20($.auction[auctionId].currency),
            msg.sender,
            address(this),
            newPrice + $.auction[auctionId].fee
        );
    }

    /**
     * @inheritdoc IAuctionHouse
     *
     * @dev Subsequent bid path. The function:
     *   - Transfers `newPrice + fee` from the caller.
     *   - Refunds `oldPrice + fee` to the previously highest `buyer`.
     *   - Updates storage and emits {Raised}.
     *
     * Reverts with {AuctionHouseRaiseTooLow} when `newPrice` is less than
     * `current price + step`.
     *
     * @param auctionId Identifier of the auction with an existing buyer.
     * @param newPrice New highest bid in USDC.
     */
    function raise(
        uint256 auctionId,
        uint256 newPrice
    )
        external
        payable
        authorizedBuyer(msg.sender)
        auctionExists(auctionId)
        auctionNotEnded(auctionId)
        withBuyer(auctionId)
    {
        AuctionHouseStorage.Layout storage $ = AuctionHouseStorage.layout();

        Auction.Type memory _auction = $.auction[auctionId];

        uint256 step = _auction.step;
        uint256 price = _auction.price;
        uint256 fee = _auction.fee;
        address currency = _auction.currency;

        if (newPrice < price + step) {
            revert AuctionHouseRaiseTooLow(price + step);
        }

        emit Raised(auctionId, msg.sender, newPrice);

        SafeERC20.safeTransferFrom(
            IERC20(currency),
            msg.sender,
            address(this),
            newPrice + fee //
        );

        address buyer = _auction.buyer;

        $.auction[auctionId].buyer = msg.sender;
        $.auction[auctionId].price = newPrice;

        SafeERC20.safeTransfer(
            IERC20(currency),
            buyer,
            price + fee //
        );
    }

    /**
     * @inheritdoc IAuctionHouse
     *
     * @dev Finalizes the auction after `endTime`:
     *   1. Marks auction as sold and emits {Sold}.
     *   2. Mints the NFT to the stored `buyer` via {ArtToken.mintFromAuctionHouse}.
     *   3. Transfers the platform `fee` to the treasury (owner of {Roles.FINANCIAL_ROLE}).
     *   4. Splits the sale `price` among `participants` according to `shares` using
     *      {ShareDistributor.distribute}.
     *
     * Reverts with {AuctionHouseTokenSold} if already settled.
     *
     * @param auctionId Identifier of the auction to settle.
     */
    function finish(uint256 auctionId) external auctionExists(auctionId) auctionEnded(auctionId) withBuyer(auctionId) {
        AuctionHouseStorage.Layout storage $ = AuctionHouseStorage.layout();

        Auction.Type memory _auction = $.auction[auctionId];

        if (_auction.sold) {
            revert AuctionHouseTokenSold();
        }

        $.auction[auctionId].sold = true;

        emit Sold(auctionId);

        ART_TOKEN.mintFromAuctionHouse(
            _auction.buyer,
            _auction.tokenId,
            _auction.tokenURI,
            $.tokenConfig[_auction.tokenId]
        );

        address currency = _auction.currency;

        SafeERC20.safeTransfer(
            IERC20(currency),
            uniqueRoleOwner(Roles.FINANCIAL_ROLE),
            _auction.fee //
        );

        ShareDistributor.distribute(
            currency,
            _auction.price,
            _auction.participants,
            _auction.shares //
        );
    }

    /**
     * @inheritdoc IAuctionHouse
     *
     * @dev Cancels an auction that has no bids.
     *      Can only be called by an account with the `ADMIN_ROLE`.
     *      The function marks the auction as ended by setting its `endTime` to the current block timestamp.
     *
     * @param auctionId Identifier of the auction to cancel.
     */
    function cancel(
        uint256 auctionId
    ) external auctionExists(auctionId) auctionNotEnded(auctionId) withoutBuyer(auctionId) onlyRole(Roles.ADMIN_ROLE) {
        AuctionHouseStorage.Layout storage $ = AuctionHouseStorage.layout();

        // Mark the auction as ended by setting endTime to current timestamp
        $.auction[auctionId].endTime = block.timestamp;

        emit Cancelled(auctionId);
    }

    /**
     * @inheritdoc IAuctionHouse
     */
    function auction(uint256 auctionId) external view auctionExists(auctionId) returns (Auction.Type memory) {
        AuctionHouseStorage.Layout storage $ = AuctionHouseStorage.layout();

        return $.auction[auctionId];
    }

    /**
     * @inheritdoc IAuctionHouse
     *
     * @return reserved True if the token is currently locked by an active auction or an ended
     *                  auction with a buyer.
     */
    function tokenReserved(uint256 tokenId) public view returns (bool reserved) {
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

        if (_auctionWithBuyer(auctionId)) {
            // The auction has a buyer
            return true;
        }

        // The auction has ended without a buyer
        return false;
    }

    /**
     * @notice Internal helper that returns true if `auctionId`'s `endTime` is in the past.
     *
     * @param auctionId The ID of the auction to check.
     * @return bool True if the auction has ended, false otherwise.
     */
    function _auctionEnded(uint256 auctionId) private view returns (bool) {
        AuctionHouseStorage.Layout storage $ = AuctionHouseStorage.layout();

        return $.auction[auctionId].endTime <= block.timestamp;
    }

    /**
     * @notice Internal helper that checks whether an auction struct has been populated.
     * @param auctionId The ID of the auction to check.
     * @return bool True if the auction exists, false otherwise.
     */
    function _auctionExists(uint256 auctionId) private view returns (bool) {
        AuctionHouseStorage.Layout storage $ = AuctionHouseStorage.layout();

        return $.auction[auctionId].endTime != 0;
    }

    /**
     * @notice Internal helper that returns true when an auction has a non-zero buyer.
     * @param auctionId The ID of the auction to check.
     * @return bool True if the auction has a buyer, false otherwise.
     */
    function _auctionWithBuyer(uint256 auctionId) private view returns (bool) {
        AuctionHouseStorage.Layout storage $ = AuctionHouseStorage.layout();

        return $.auction[auctionId].buyer != address(0);
    }
}
