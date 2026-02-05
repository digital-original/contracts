// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {EIP712Domain} from "../utils/EIP712Domain.sol";
import {RoleSystem} from "../utils/role-system/RoleSystem.sol";
import {Authorization} from "../utils/Authorization.sol";
import {SafeERC20BulkTransfer} from "../utils/SafeERC20BulkTransfer.sol";
import {TokenConfig} from "../utils/TokenConfig.sol";
import {Roles} from "../utils/Roles.sol";
import {IAuctionHouse} from "../auction-house/IAuctionHouse.sol";
import {ArtTokenConfigManager} from "./art-token-config-manager/ArtTokenConfigManager.sol";
import {TokenMintingPermit} from "./libraries/TokenMintingPermit.sol";
import {ArtTokenBase} from "./ArtTokenBase.sol";
import {IArtToken} from "./IArtToken.sol";

/**
 * @title ArtToken
 *
 * @notice Upgradeable ERC-721 token used by DigitalOriginal protocols. Adds primary-sale
 *         logic, integrates EIP-712 permits and enforces optional transfer
 *         restrictions for regulated collections.
 */
contract ArtToken is IArtToken, ArtTokenBase, EIP712Domain, RoleSystem, Authorization, ArtTokenConfigManager {
    // TODO: need to implement method for validation mint conditions (tokenId, URI, config, etc)
    using SafeERC20 for IERC20;
    using TokenMintingPermit for TokenMintingPermit.Type;

    /// @notice Address of the accompanying AuctionHouse contract.
    IAuctionHouse public immutable AUCTION_HOUSE;

    /// @notice Settlement token.
    IERC20 public immutable USDC;

    /// @notice Minimum allowed primary-sale price.
    uint256 public immutable MIN_PRICE;

    /// @notice Minimum allowed platform fee.
    uint256 public immutable MIN_FEE;

    /**
     * @notice Contract constructor.
     *
     * @param proxy Address of the proxy that will ultimately own the implementation
     *              (used for EIP-712 domain separator).
     * @param main Address that will be set as {RoleSystem.MAIN}.
     * @param auctionHouse Address of the AuctionHouse contract.
     * @param usdc Address of the USDC token contract.
     * @param minPrice Absolute minimum `price` accepted for a primary sale.
     * @param minFee Absolute minimum `fee` accepted for a primary sale.
     */
    constructor(
        address proxy,
        address main,
        address auctionHouse,
        address usdc,
        uint256 minPrice,
        uint256 minFee
    ) EIP712Domain(proxy, "ArtToken", "1") RoleSystem(main) {
        if (auctionHouse == address(0)) revert ArtTokenMisconfiguration(2);
        if (usdc == address(0)) revert ArtTokenMisconfiguration(3);
        if (minPrice == 0) revert ArtTokenMisconfiguration(4);
        if (minFee == 0) revert ArtTokenMisconfiguration(5);

        AUCTION_HOUSE = IAuctionHouse(auctionHouse);
        USDC = IERC20(usdc);
        MIN_PRICE = minPrice;
        MIN_FEE = minFee;
    }

    /**
     * @inheritdoc IArtToken
     */
    function mintFromAuctionHouse(
        address to,
        uint256 tokenId,
        string calldata _tokenURI,
        TokenConfig.Type calldata tokenConfig
    ) external {
        if (msg.sender != address(AUCTION_HOUSE)) {
            revert ArtTokenUnauthorizedAccount(msg.sender);
        }

        _mint(to, tokenId, _tokenURI, tokenConfig);
    }

    /**
     * @inheritdoc IArtToken
     */
    function mint(TokenMintingPermit.Type calldata permit, bytes calldata permitSignature) external {
        _requireAuthorizedAction(permit.hash(), permit.deadline, permitSignature);

        if (permit.minter != msg.sender) {
            revert ArtTokenUnauthorizedAccount(msg.sender);
        }

        if (permit.price < MIN_PRICE) {
            revert ArtTokenInvalidPrice();
        }

        if (permit.fee < MIN_FEE) {
            revert ArtTokenInvalidFee();
        }

        if (AUCTION_HOUSE.tokenReserved(permit.tokenId)) {
            revert ArtTokenTokenReserved();
        }

        _mint(permit.minter, permit.tokenId, permit.tokenURI, permit.tokenConfig);

        USDC.safeTransferFrom(msg.sender, address(this), permit.price + permit.fee);

        SafeERC20BulkTransfer.safeTransfer(USDC, permit.price, permit.participants, permit.rewards);

        USDC.safeTransfer(uniqueRoleOwner(Roles.FINANCIAL_ROLE), permit.fee);
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
        return account.code.length == 0 || hasRole(Roles.PARTNER_ROLE, account);
    }

    /**
     * @notice Internal function to mint a new token.
     * @dev This function is called by both `mintFromAuctionHouse` and `mint`. It handles the core
     *      minting logic and sets the token URI and configuration.
     * @param to The address that will receive the newly minted token.
     * @param tokenId The unique identifier of the token to mint.
     * @param _tokenURI The metadata URI that will be associated with the token.
     * @param tokenConfig The configuration for the token.
     */
    function _mint(
        address to,
        uint256 tokenId,
        string calldata _tokenURI,
        TokenConfig.Type calldata tokenConfig
    ) internal {
        if (bytes(_tokenURI).length == 0) {
            revert ArtTokenEmptyTokenURI();
        }

        _safeMintAndSetTokenURI(to, tokenId, _tokenURI);
        _setTokenConfig(tokenId, tokenConfig);
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
    function _beforeTransfer(address to, uint256 tokenId, address auth) internal view override {
        if (_tokenRegulationMode(tokenId) == TokenConfig.RegulationMode.Regulated) {
            _requireAuthorizedRecipient(to);
            _requireAuthorizedRecipient(auth);
        }
    }

    /**
     * @inheritdoc ArtTokenBase
     *
     * @dev Hook that ensures the recipient of an approval is compliant with the collection's
     *      rules.
     */
    function _beforeApprove(address to, uint256 tokenId) internal view override {
        if (_tokenRegulationMode(tokenId) == TokenConfig.RegulationMode.Regulated) {
            _requireAuthorizedRecipient(to);
        }
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
