// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {EIP712Domain} from "../utils/EIP712Domain.sol";
import {RoleSystem} from "../utils/role-system/RoleSystem.sol";
import {Authorization} from "../utils/Authorization.sol";
import {CurrencyManager} from "../utils/currency-manager/CurrencyManager.sol";
import {SafeERC20BulkTransfer} from "../utils/SafeERC20BulkTransfer.sol";
import {TokenConfig} from "../utils/TokenConfig.sol";
import {Roles} from "../utils/Roles.sol";
import {IAuctionHouse} from "../auction-house/IAuctionHouse.sol";
import {ArtTokenConfigManager} from "./art-token-config-manager/ArtTokenConfigManager.sol";
import {TokenMintingPermit} from "./libraries/TokenMintingPermit.sol";
import {ArtTokenRoyaltyManager} from "./ArtTokenRoyaltyManager.sol";
import {ArtTokenBase} from "./ArtTokenBase.sol";
import {IArtToken} from "./IArtToken.sol";

/**
 * @title ArtToken
 *
 * @notice Upgradeable ERC-721 token used by DigitalOriginal protocols. Adds primary-sale
 *         logic, integrates EIP-712 permits and enforces optional transfer
 *         restrictions for regulated collections.
 */
contract ArtToken is
    IArtToken,
    ArtTokenBase,
    EIP712Domain,
    RoleSystem,
    Authorization,
    CurrencyManager,
    ArtTokenConfigManager,
    ArtTokenRoyaltyManager
{
    using TokenMintingPermit for TokenMintingPermit.Type;

    /// @notice Address of the accompanying AuctionHouse contract.
    IAuctionHouse public immutable AUCTION_HOUSE;

    /**
     * @notice Contract constructor.
     *
     * @param proxy Address of the proxy that will ultimately own the implementation
     *              (used for EIP-712 domain separator).
     * @param main Address that will be set as {RoleSystem.MAIN}.
     * @param auctionHouse Address of the AuctionHouse contract.
     */
    constructor(
        address proxy,
        address main,
        address auctionHouse
    ) EIP712Domain(proxy, "ArtToken", "1") RoleSystem(main) {
        if (auctionHouse == address(0)) revert ArtTokenMisconfiguration(2);

        AUCTION_HOUSE = IAuctionHouse(auctionHouse);
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
    function mint(TokenMintingPermit.Type calldata permit, bytes calldata permitSignature) external payable {
        _requireAuthorizedAction(permit.hash(), permit.deadline, permitSignature);

        if (permit.minter != msg.sender) {
            revert ArtTokenUnauthorizedAccount(msg.sender);
        }

        if (permit.price == 0) {
            revert ArtTokenInvalidPrice();
        }

        if (permit.fee == 0) {
            revert ArtTokenInvalidFee();
        }

        if (AUCTION_HOUSE.tokenReserved(permit.tokenId)) {
            revert ArtTokenTokenReserved();
        }

        if (!currencyAllowed(permit.currency)) {
            revert ArtTokenCurrencyInvalid();
        }

        IERC20 currency = IERC20(permit.currency);

        _mint(permit.minter, permit.tokenId, permit.tokenURI, permit.tokenConfig);

        SafeERC20.safeTransferFrom(currency, msg.sender, address(this), permit.price + permit.fee);

        SafeERC20BulkTransfer.safeTransfer(currency, permit.price, permit.participants, permit.rewards);

        SafeERC20.safeTransfer(currency, uniqueRoleOwner(Roles.FINANCIAL_ROLE), permit.fee);
    }

    /**
     * @inheritdoc IArtToken
     */
    function setTokenURI(uint256 tokenId, string memory _tokenURI) external onlyRole(Roles.ADMIN_ROLE) {
        if (_ownerOf(tokenId) == address(0)) {
            revert ArtTokenNonexistentToken(tokenId);
        }

        _setTokenURI(tokenId, _tokenURI);
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
     *
     * @dev This function is called by both `mintFromAuctionHouse` and `mint`. It handles the core
     *      minting logic and sets the token URI and configuration.
     *
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
        _safeMintAndSetTokenURI(to, tokenId, _tokenURI);
        _setTokenConfig(tokenId, tokenConfig);
    }

    /**
     * @notice Reverts unless `account` passes {recipientAuthorized}.
     *
     * @dev This function is used to enforce that only authorized accounts can receive tokens.
     *
     * @param account The account to check.
     */
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
