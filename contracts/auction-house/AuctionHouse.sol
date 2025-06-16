// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.20;

import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {EIP712Domain} from "../utils/EIP712Domain.sol";
import {RoleSystem} from "../utils/role-system/RoleSystem.sol";
import {Authorization} from "../utils/Authorization.sol";
import {Distribution} from "../utils/Distribution.sol";
import {Roles} from "../utils/Roles.sol";
import {IArtToken} from "../art-token/IArtToken.sol";
import {AuctionHouseStorage} from "./AuctionHouseStorage.sol";
import {IAuctionHouse} from "./IAuctionHouse.sol";

/**
 * @title AuctionHouse
 *
 * @notice Upgradeable English-auction contract that conducts primary sales for
 *         NFTs minted by {ArtToken}. Users create auctions via an authorized
 *         EIP-712 permit, place bids in USDC and, after the auction ends,
 *         the highest bidder receives the token while funds are split between
 *         participants and the protocol treasury.
 *
 * @dev Implements {IAuctionHouse}. Uses mix-ins for EIP-712 domain
 *      separation, role management and signature authorization.
 */
contract AuctionHouse is IAuctionHouse, EIP712Domain, RoleSystem, Authorization {
    using SafeERC20 for IERC20;

    /**
     * @notice EIP-712 struct type-hash used to validate `CreatePermit` signatures
     *         supplied to {create}.
     */
    bytes32 public constant CREATE_PERMIT_TYPE_HASH =
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

    /// @notice Address of the associated {ArtToken} contract.
    IArtToken public immutable ART_TOKEN;

    /// @notice Settlement token (USDC) used for bidding and payouts.
    IERC20 public immutable USDC;

    /// @notice Minimum auction duration configured at deployment.
    uint256 public immutable MIN_DURATION;

    /// @notice Hard-coded upper bound for auction duration (21 days).
    uint256 public constant MAX_DURATION = 21 days;

    /// @notice Minimal allowed starting price / bid value.
    uint256 public immutable MIN_PRICE;

    /// @notice Minimal platform fee that must accompany each auction.
    uint256 public immutable MIN_FEE;

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
     * @param proxy              Proxy address used for EIP-712 verifying contract.
     * @param main               Address that will be set as {RoleSystem.MAIN}.
     * @param artToken           Address of the {ArtToken} contract.
     * @param usdc               Address of the USDC ERC-20 token.
     * @param minAuctionDuration Minimum auction duration (seconds).
     * @param minPrice           Minimum starting price/bid.
     * @param minFee             Minimum platform fee.
     */
    constructor(
        address proxy,
        address main,
        address artToken,
        address usdc,
        uint256 minAuctionDuration,
        uint256 minPrice,
        uint256 minFee
    ) EIP712Domain(proxy, "AuctionHouse", "1") RoleSystem(main) {
        if (artToken == address(0)) revert AuctionHouseMisconfiguration(2);
        if (usdc == address(0)) revert AuctionHouseMisconfiguration(3);
        if (minAuctionDuration == 0) revert AuctionHouseMisconfiguration(4);
        if (minPrice == 0) revert AuctionHouseMisconfiguration(5);
        if (minFee == 0) revert AuctionHouseMisconfiguration(6);

        ART_TOKEN = IArtToken(artToken);
        USDC = IERC20(usdc);
        MIN_DURATION = minAuctionDuration;
        MIN_PRICE = minPrice;
        MIN_FEE = minFee;
    }

    /**
     * @inheritdoc IAuctionHouse
     *
     * @dev Flow:
     *  1. Validates `params` and the EIP-712 permit signed by the protocol signer.
     *  2. Writes a new {IAuctionHouse.Auction} struct to storage and maps
     *     `params.tokenId` to `params.auctionId`.
     *  3. Emits {Created}.
     *
     *  Validation details:
     *   - Reverts {AuctionHouseEmptyTokenURI} when `tokenURI` is empty.
     *   - Reverts {AuctionHouseInvalidPrice}, {AuctionHouseInvalidFee},
     *     {AuctionHouseInvalidStep} when monetary params are below minima.
     *   - Reverts {AuctionHouseInvalidEndTime} if `endTime` is not within the
     *     `[block.timestamp + MIN_DURATION, block.timestamp + MAX_DURATION]` window.
     *   - Reverts {AuctionHouseTokenReserved} when the token is already locked
     *     by another auction or minted.
     *   - Reverts {AuctionHouseAuctionExists} if `auctionId` is already used.
     *
     * @param params See {IAuctionHouse.CreateParams}.
     */
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
                keccak256(abi.encodePacked(params.participants)),
                keccak256(abi.encodePacked(params.shares)),
                params.deadline
            )
        );

        _requireAuthorizedAction(structHash, params.deadline, params.signature);

        if (bytes(params.tokenURI).length == 0) {
            revert AuctionHouseEmptyTokenURI();
        }

        if (params.price < MIN_PRICE) {
            revert AuctionHouseInvalidPrice();
        }

        if (params.fee < MIN_FEE) {
            revert AuctionHouseInvalidFee();
        }

        if (params.step == 0) {
            revert AuctionHouseInvalidStep();
        }

        if (params.endTime < block.timestamp + MIN_DURATION) {
            revert AuctionHouseInvalidEndTime();
        }

        if (params.endTime > block.timestamp + MAX_DURATION) {
            revert AuctionHouseInvalidEndTime();
        }

        if (tokenReserved(params.tokenId)) {
            revert AuctionHouseTokenReserved();
        }

        if (ART_TOKEN.tokenReserved(params.tokenId)) {
            revert AuctionHouseTokenReserved();
        }

        Distribution.requireValidConditions(params.participants, params.shares);

        AuctionHouseStorage.Layout storage $ = AuctionHouseStorage.layout();

        $.auction[params.auctionId] = Auction({
            tokenId: params.tokenId,
            price: params.price,
            fee: params.fee,
            step: params.step,
            endTime: params.endTime,
            buyer: address(0),
            sold: false,
            tokenURI: params.tokenURI,
            participants: params.participants,
            shares: params.shares
        });

        $.tokenAuctionId[params.tokenId] = params.auctionId;

        emit Created(params.auctionId, params.tokenId, params.price, params.endTime);
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
     *  Reverts with {AuctionHouseRaiseTooLow} if `newPrice < initial price`.
     *
     * @param auctionId Identifier of the auction that has no current buyer.
     * @param newPrice  First bid amount in USDC.
     */
    function raiseInitial(
        uint256 auctionId,
        uint256 newPrice
    ) external authorizedBuyer(msg.sender) auctionExists(auctionId) auctionNotEnded(auctionId) withoutBuyer(auctionId) {
        AuctionHouseStorage.Layout storage $ = AuctionHouseStorage.layout();

        if (newPrice < $.auction[auctionId].price) {
            revert AuctionHouseRaiseTooLow($.auction[auctionId].price);
        }

        emit Raised(auctionId, msg.sender, newPrice);

        $.auction[auctionId].buyer = msg.sender;
        $.auction[auctionId].price = newPrice;

        USDC.safeTransferFrom(msg.sender, address(this), newPrice + $.auction[auctionId].fee);
    }

    /**
     * @inheritdoc IAuctionHouse
     *
     * @dev Subsequent bid path. The function:
     *   - Transfers `newPrice + fee` from the caller.
     *   - Refunds `oldPrice + fee` to the previously highest `buyer`.
     *   - Updates storage and emits {Raised}.
     *
     *  Reverts with {AuctionHouseRaiseTooLow} when `newPrice` is less than
     *  `current price + step`.
     *
     * @param auctionId Identifier of the auction with an existing buyer.
     * @param newPrice  New highest bid in USDC.
     */
    function raise(
        uint256 auctionId,
        uint256 newPrice
    ) external authorizedBuyer(msg.sender) auctionExists(auctionId) auctionNotEnded(auctionId) withBuyer(auctionId) {
        AuctionHouseStorage.Layout storage $ = AuctionHouseStorage.layout();

        Auction memory _auction = $.auction[auctionId];

        uint256 price = _auction.price;
        address buyer = _auction.buyer;
        uint256 step = _auction.step;
        uint256 fee = _auction.fee;

        if (newPrice < price + step) {
            revert AuctionHouseRaiseTooLow(price + step);
        }

        $.auction[auctionId].buyer = msg.sender;
        $.auction[auctionId].price = newPrice;

        emit Raised(auctionId, msg.sender, newPrice);

        USDC.safeTransferFrom(msg.sender, address(this), newPrice + fee);
        USDC.safeTransfer(buyer, price + fee);
    }

    /**
     * @inheritdoc IAuctionHouse
     *
     * @dev Finalizes the auction after `endTime`:
     *   1. Marks auction as sold and emits {Sold}.
     *   2. Mints the NFT to the stored `buyer` via {ArtToken.mint}.
     *   3. Transfers the platform `fee` to the treasury (owner of
     *      {Roles.FINANCIAL_ROLE}).
     *   4. Splits the sale `price` among `participants` according to `shares`
     *      using {Distribution.distribute}.
     *
     *  Reverts with {AuctionHouseTokenSold} if already settled.
     *
     * @param auctionId Identifier of the auction to settle.
     */
    function finish(uint256 auctionId) external auctionExists(auctionId) auctionEnded(auctionId) withBuyer(auctionId) {
        AuctionHouseStorage.Layout storage $ = AuctionHouseStorage.layout();

        Auction memory _auction = $.auction[auctionId];

        if (_auction.sold) {
            revert AuctionHouseTokenSold();
        }

        $.auction[auctionId].sold = true;

        emit Sold(auctionId);

        ART_TOKEN.mint(_auction.buyer, _auction.tokenId, _auction.tokenURI);

        USDC.safeTransfer(uniqueRoleOwner(Roles.FINANCIAL_ROLE), _auction.fee);

        Distribution.distribute(USDC, _auction.price, _auction.participants, _auction.shares);
    }

    /**
     * @inheritdoc IAuctionHouse
     */
    function auction(uint256 auctionId) external view auctionExists(auctionId) returns (Auction memory) {
        AuctionHouseStorage.Layout storage $ = AuctionHouseStorage.layout();

        return $.auction[auctionId];
    }

    /**
     * @inheritdoc IAuctionHouse
     *
     * @return reserved True if the token is currently locked by an active
     *                  auction or an ended auction with a buyer.
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

    /// @dev Internal helper that returns true if `auctionId`'s `endTime` is in the past.
    function _auctionEnded(uint256 auctionId) private view returns (bool) {
        AuctionHouseStorage.Layout storage $ = AuctionHouseStorage.layout();

        return $.auction[auctionId].endTime <= block.timestamp;
    }

    /// @dev Internal helper that checks whether an auction struct has been populated.
    function _auctionExists(uint256 auctionId) private view returns (bool) {
        AuctionHouseStorage.Layout storage $ = AuctionHouseStorage.layout();

        return $.auction[auctionId].endTime != 0;
    }

    /// @dev Internal helper that returns true when an auction has a non-zero buyer.
    function _auctionWithBuyer(uint256 auctionId) private view returns (bool) {
        AuctionHouseStorage.Layout storage $ = AuctionHouseStorage.layout();

        return $.auction[auctionId].buyer != address(0);
    }
}
