// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {RoleSystem} from "../utils/role-system/RoleSystem.sol";
import {EIP712} from "../utils/EIP712.sol";
import {Distribution} from "../utils/Distribution.sol";
import {IAuctionHouse} from "../auction-house/IAuctionHouse.sol";
import {ArtTokenBase} from "./ArtTokenBase.sol";
import {IArtToken} from "./IArtToken.sol";

/**
 * @title ArtToken
 *
 * @notice ArtToken contract extends ERC721 standard.
 * The contract provides functionality to track, transfer and sell Digital Original NFTs.
 */
contract ArtToken is IArtToken, ArtTokenBase, RoleSystem, EIP712("ArtToken", "1") {
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

    IAuctionHouse public immutable AUCTION_HOUSE; // AuctionHouse contract address
    IERC20 public immutable USDC; // USDC asset contract address

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant FINANCIAL_ROLE = keccak256("FINANCIAL_ROLE");
    bytes32 public constant PARTNER_ROLE = keccak256("PARTNER_ROLE");

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
     * @param main The main account for managing the role system.
     * @param auctionHouse AuctionHouse contract address.
     * @param usdc USDC asset contract address.
     */
    constructor(address main, address auctionHouse, address usdc) RoleSystem(main) {
        if (auctionHouse == address(0)) revert ArtTokenMisconfiguration(1);
        if (usdc == address(0)) revert ArtTokenMisconfiguration(2);

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
     *  Only account with a minting permission can invoke the method.
     */
    function mint(address to, uint256 tokenId, string memory _tokenURI) external canMint {
        _safeMintAndSetTokenURI(to, tokenId, _tokenURI);
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

        _requireValidSignature(uniqueRoleAccount(ADMIN_ROLE), structHash, params.deadline, params.signature);

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

        USDC.safeTransfer(uniqueRoleAccount(FINANCIAL_ROLE), params.fee);

        _safeMintAndSetTokenURI(msg.sender, params.tokenId, params.tokenURI);
    }

    /**
     * @inheritdoc IArtToken
     */
    function tokenReserved(uint256 tokenId) external view returns (bool) {
        return _ownerOf(tokenId) != address(0);
    }

    /**
     * @inheritdoc IArtToken
     */
    function recipientAuthorized(address account) external view returns (bool) {
        return account.code.length == 0 || hasRole(PARTNER_ROLE, account);
    }

    /**
     * @dev Throws if the account is not authorized.
     */
    function _requireAuthorizedRecipient(address account) private view {
        if (account.code.length != 0) _requireRole(PARTNER_ROLE, account);
    }

    /**
     * @dev Overriding the hook. Extends the token-transferring logic,
     *  checks if a token recipient is authorized.
     */
    function _beforeTransfer(address to, uint256 /* tokenId */) internal view override {
        _requireAuthorizedRecipient(to);
    }

    /**
     * @dev Overriding the hook. Extends the approval-providing logic,
     *  checks if an approval recipient is authorized.
     */
    function _beforeApprove(address to, uint256 /* tokenId */) internal view override {
        _requireAuthorizedRecipient(to);
    }

    /**
     * @dev Overriding the hook. Forbids the logic of approval-providing for all tokens.
     */
    function _beforeSetApprovalForAll(address /* operator */, bool /* approved */) internal pure override {
        revert ArtTokenForbiddenAction();
    }
}
