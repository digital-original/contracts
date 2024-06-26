// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {EIP712} from "../utils/EIP712.sol";
import {Distribution} from "../utils/Distribution.sol";
import {ArtTokenBase} from "./ArtTokenBase.sol";
import {IArtToken} from "./IArtToken.sol";
import {IAuctionHouse} from "../auction-house/IAuctionHouse.sol";

/**
 * @title ArtToken
 *
 * @notice ArtToken contract extends ERC721 standard.
 * The contract provides functionality to track, transfer and sell Digital Original NFTs.
 */
contract ArtToken is IArtToken, ArtTokenBase, EIP712 {
    using SafeERC20 for IERC20;

    bytes32 public constant BUY_PERMIT_TYPE_HASH =
        // prettier-ignore
        keccak256(
            "BuyPermit("
                "uint256 tokenId,"
                "string tokenURI,"
                "address sender,"
                "uint256 price,"
                "uint256 fee,"
                "address[] participants,"
                "uint256[] shares,"
                "uint256 deadline"
            ")"
        );

    address public immutable ADMIN; // Admin address
    address public immutable PLATFORM; // Platform address
    IAuctionHouse public immutable AUCTION_HOUSE; // AuctionHouse contract address
    IERC20 public immutable USDC; // USDC asset contract address
    uint256 public constant MIN_PRICE = 100_000_000; // Minimum price value
    uint256 public constant MIN_FEE = 100_000_000; // Minimum fee value

    /**
     * @dev Throws if called by any account without a minting permission.
     */
    modifier canMint() {
        if (msg.sender != address(AUCTION_HOUSE)) {
            revert ArtTokenUnauthorizedAccount(msg.sender);
        }

        _;
    }

    /**
     * @param admin Admin address.
     * @param platform Platform address.
     * @param auctionHouse AuctionHouse contract address.
     * @param usdc USDC asset contract address.
     */
    constructor(address admin, address platform, address auctionHouse, address usdc) EIP712("ArtToken", "1") {
        if (admin == address(0)) revert ArtTokenMisconfiguration(1);
        if (platform == address(0)) revert ArtTokenMisconfiguration(2);
        if (auctionHouse == address(0)) revert ArtTokenMisconfiguration(3);
        if (usdc == address(0)) revert ArtTokenMisconfiguration(4);

        ADMIN = admin;
        PLATFORM = platform;
        AUCTION_HOUSE = IAuctionHouse(auctionHouse);
        USDC = IERC20(usdc);
    }

    /**
     * @dev Initializes the contract by setting a `name` and a `symbol`.
     */
    function initialize() external {
        _initialize("DigitalOriginal", "DO");
    }

    /**
     * @inheritdoc IArtToken
     *
     * @dev Mints `tokenId` and transfers it to `to`. Sets `_tokenURI` as the tokenURI of `tokenId`.
     * @dev Only account with a minting permission can invoke the method.
     */
    function mint(address to, uint256 tokenId, string memory _tokenURI) external canMint {
        _mintAndSetTokenURI(to, tokenId, _tokenURI);
    }

    /**
     * @inheritdoc IArtToken
     *
     * @dev Mints `tokenId` and transfers it to `msg.sender` (buyer), charges `price` and `fee` from `msg.sender`,
     * distributes `price` between `participants` according to `shares`, and sends `fee` to a platform account.
     */
    function buy(BuyParams calldata params) external {
        bytes32 structHash = keccak256(
            abi.encode(
                BUY_PERMIT_TYPE_HASH,
                params.tokenId,
                keccak256(bytes(params.tokenURI)),
                msg.sender,
                params.price,
                params.fee,
                keccak256(abi.encodePacked(params.participants)),
                keccak256(abi.encodePacked(params.shares)),
                params.deadline
            )
        );

        _requireValidSignature(ADMIN, structHash, params.deadline, params.signature);

        if (bytes(params.tokenURI).length == 0) {
            revert ArtTokenEmptyTokenURI();
        }

        if (params.price < MIN_PRICE) {
            revert ArtTokenInvalidPrice(params.price);
        }

        if (params.fee < MIN_FEE) {
            revert ArtTokenInvalidFee(params.fee);
        }

        if (AUCTION_HOUSE.tokenReserved(params.tokenId)) {
            revert ArtTokenReserved(params.tokenId);
        }

        uint256 payment = params.price + params.fee;

        USDC.safeTransferFrom(msg.sender, address(this), payment);

        Distribution.safeDistribute(USDC, params.price, params.participants, params.shares);

        USDC.safeTransfer(PLATFORM, params.fee);

        _mintAndSetTokenURI(msg.sender, params.tokenId, params.tokenURI);
    }

    /**
     * @inheritdoc IArtToken
     */
    function tokenReserved(uint256 tokenId) external view returns (bool) {
        return _ownerOf(tokenId) != address(0);
    }

    /**
     * @notice Adds logic to restrict token transfers to smart contracts.
     * This restriction is necessary to prevent sales via smart contracts wherein Digital Original™ cannot
     * assure compliance with the terms of sale of DO NFT for authors, galleries, and art institutions.
     * This restriction will be changed after the launch of a contract developed by Digital Original™
     * with secondary market functionality.
     *
     * @dev Extends `ERC20::_update` method.
     */
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal virtual override(ArtTokenBase) returns (address) {
        if (to.code.length > 0) {
            revert ArtTokenInvalidReceiver(to);
        }

        return ArtTokenBase._update(to, tokenId, auth);
    }
}
