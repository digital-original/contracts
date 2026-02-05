// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {EIP712Domain} from "../utils/EIP712Domain.sol";
import {RoleSystem} from "../utils/role-system/RoleSystem.sol";
import {Authorization} from "../utils/Authorization.sol";
import {Distribution} from "../utils/Distribution.sol";
import {Roles} from "../utils/Roles.sol";
import {IAuctionHouse} from "../auction-house/IAuctionHouse.sol";
import {ArtTokenBase} from "./ArtTokenBase.sol";
import {IArtToken} from "./IArtToken.sol";

/**
 * @title ArtToken
 *
 * @notice Upgradeable ERC-721 token used by DigitalOriginal protocols. Adds primary-sale
 *         logic via `buy`, integrates EIP-712 permits and enforces optional transfer
 *         restrictions for regulated collections.
 */
contract ArtToken is IArtToken, ArtTokenBase, EIP712Domain, RoleSystem, Authorization {
    using SafeERC20 for IERC20;

    /**
     * @notice EIP-712 struct type-hash used to validate `BuyPermit` signatures
     *         supplied to {buy}.
     *
     * @dev The `sender` field, which is part of the signed data, is implicitly set to
     *      `msg.sender` during the execution of the {buy} function. This ensures that the permit
     *      can only be used by the intended buyer.
     */
    // prettier-ignore
    bytes32 public constant BUY_PERMIT_TYPE_HASH =
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

    /// @notice Address of the accompanying AuctionHouse contract.
    IAuctionHouse public immutable AUCTION_HOUSE;

    /// @notice Settlement token (USDC) accepted by `buy`.
    IERC20 public immutable USDC;

    /// @notice Minimum allowed primary-sale price (protocol-level constant).
    uint256 public immutable MIN_PRICE;

    /// @notice Minimum allowed platform fee (protocol-level constant).
    uint256 public immutable MIN_FEE;

    /// @notice If true, transfers are limited to EOAs and partners only.
    bool public immutable REGULATED;

    /// @notice Restricts a function so it can only be called by {AUCTION_HOUSE}.
    modifier onlyAuctionHouse() {
        if (msg.sender != address(AUCTION_HOUSE)) {
            revert ArtTokenUnauthorizedAccount(msg.sender);
        }

        _;
    }

    /**
     * @notice Contract constructor.
     *
     * @param proxy Address of the proxy that will ultimately own the implementation
     *              (used for EIP-712 domain separator).
     * @param main Address that will be set as {RoleSystem.MAIN}.
     * @param auctionHouse Address of the AuctionHouse contract.
     * @param usdc Address of the USDC token contract.
     * @param minPrice Absolute minimum `price` accepted by `buy`.
     * @param minFee Absolute minimum `fee` accepted by `buy`.
     * @param regulated Whether transfer restrictions are enabled.
     */
    constructor(
        address proxy,
        address main,
        address auctionHouse,
        address usdc,
        uint256 minPrice,
        uint256 minFee,
        bool regulated
    ) EIP712Domain(proxy, "ArtToken", "1") RoleSystem(main) {
        if (auctionHouse == address(0)) revert ArtTokenMisconfiguration(2);
        if (usdc == address(0)) revert ArtTokenMisconfiguration(3);
        if (minPrice == 0) revert ArtTokenMisconfiguration(4);
        if (minFee == 0) revert ArtTokenMisconfiguration(5);

        AUCTION_HOUSE = IAuctionHouse(auctionHouse);
        USDC = IERC20(usdc);
        MIN_PRICE = minPrice;
        MIN_FEE = minFee;
        REGULATED = regulated;
    }

    /**
     * @inheritdoc IArtToken
     *
     * @dev Only the {AUCTION_HOUSE} contract is authorized to call this function. The call will
     *      revert if `_tokenURI` is empty or if `tokenId` has already been minted.
     */
    function mint(address to, uint256 tokenId, string memory _tokenURI) external onlyAuctionHouse {
        if (bytes(_tokenURI).length == 0) {
            revert ArtTokenEmptyTokenURI();
        }

        _safeMintAndSetTokenURI(to, tokenId, _tokenURI);
    }

    /**
     * @inheritdoc IArtToken
     *
     * @dev Workflow:
     *  1. Recreates the EIP-712 digest for the supplied {BuyParams} and verifies the
     *     signature via {_requireAuthorizedAction}.
     *  2. Performs runtime checks listed below. Any failure reverts with a contract-specific
     *     error.
     *  3. Mints the token directly to `msg.sender` (buyer).
     *  4. Pulls `price + fee` USDC from the buyer.
     *  5. Splits `price` among `participants` according to `shares` via
     *     {Distribution.safeDistribute}.
     *  6. Sends `fee` to the protocol treasury (owner of {Roles.FINANCIAL_ROLE}).
     *
     *  Runtime requirements:
     *   - `params.tokenURI` must be non-empty → {ArtTokenEmptyTokenURI}.
     *   - `params.price` ≥ {MIN_PRICE} → {ArtTokenInvalidPrice}.
     *   - `params.fee`   ≥ {MIN_FEE}   → {ArtTokenInvalidFee}.
     *   - `AUCTION_HOUSE.tokenReserved(tokenId)` must be false → {ArtTokenTokenReserved}.
     *
     * @param params Packed struct containing all buy parameters (see {IArtToken.BuyParams}).
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

        _requireAuthorizedAction(structHash, params.deadline, params.signature);

        if (bytes(params.tokenURI).length == 0) {
            revert ArtTokenEmptyTokenURI();
        }

        if (params.price < MIN_PRICE) {
            revert ArtTokenInvalidPrice();
        }

        if (params.fee < MIN_FEE) {
            revert ArtTokenInvalidFee();
        }

        if (AUCTION_HOUSE.tokenReserved(params.tokenId)) {
            revert ArtTokenTokenReserved();
        }

        _safeMintAndSetTokenURI(msg.sender, params.tokenId, params.tokenURI);

        USDC.safeTransferFrom(msg.sender, address(this), params.price + params.fee);

        Distribution.safeDistribute(USDC, params.price, params.participants, params.shares);

        USDC.safeTransfer(uniqueRoleOwner(Roles.FINANCIAL_ROLE), params.fee);
    }

    /**
     * @inheritdoc IArtToken
     */
    function tokenReserved(uint256 tokenId) external view returns (bool reserved) {
        return _ownerOf(tokenId) != address(0);
    }

    /**
     * @inheritdoc IArtToken
     */
    function recipientAuthorized(address account) public view returns (bool authorized) {
        if (REGULATED) {
            return account.code.length == 0 || hasRole(Roles.PARTNER_ROLE, account);
        } else {
            return true;
        }
    }

    /// @dev Reverts unless `account` passes {recipientAuthorized}.
    function _requireAuthorizedRecipient(address account) private view {
        if (!recipientAuthorized(account)) {
            revert ArtTokenUnauthorizedAccount(account);
        }
    }

    /**
     * @inheritdoc ArtTokenBase
     *
     * @dev Hook that ensures both the recipient and the authorizing address are compliant with
     *      the collection's rules before any token transfer occurs.
     */
    function _beforeTransfer(address to, uint256 /* tokenId */, address auth) internal view override {
        _requireAuthorizedRecipient(to);
        _requireAuthorizedRecipient(auth);
    }

    /**
     * @inheritdoc ArtTokenBase
     *
     * @dev Hook that ensures the recipient of an approval is compliant with the collection's
     *      rules.
     */
    function _beforeApprove(address to, uint256 /* tokenId */) internal view override {
        _requireAuthorizedRecipient(to);
    }

    /**
     * @inheritdoc ArtTokenBase
     *
     * @dev Hook that ensures a new operator is compliant with the collection's rules before
     *      being approved.
     */
    function _beforeSetApprovalForAll(address operator, bool approved) internal view override {
        if (approved) {
            _requireAuthorizedRecipient(operator);
        }
    }
}
