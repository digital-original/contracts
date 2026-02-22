// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.20;

import {EIP712Domain} from "../utils/EIP712Domain.sol";
import {RoleSystem} from "../utils/role-system/RoleSystem.sol";
import {Authorization} from "../utils/Authorization.sol";
import {CurrencyManager} from "../utils/currency-manager/CurrencyManager.sol";
import {TokenConfig} from "../utils/TokenConfig.sol";
import {CurrencyTransfers} from "../utils/CurrencyTransfers.sol";
import {Roles} from "../utils/Roles.sol";
import {IAuctionHouse} from "../auction-house/IAuctionHouse.sol";
import {ArtTokenConfigManager} from "./art-token-config-manager/ArtTokenConfigManager.sol";
import {TokenMintingPermit} from "./libraries/TokenMintingPermit.sol";
import {ArtTokenRoyalty} from "./ArtTokenRoyalty.sol";
import {ArtTokenBase} from "./ArtTokenBase.sol";
import {IArtToken} from "./IArtToken.sol";

/**
 * @title ArtToken
 * @notice Upgradeable ERC-721 token used by DigitalOriginal protocols. Adds primary-sale
 *         logic, integrates EIP-712 permits and enforces optional transfer
 *         restrictions for regulated tokens.
 */
contract ArtToken is
    IArtToken,
    ArtTokenBase,
    EIP712Domain,
    RoleSystem,
    Authorization,
    CurrencyManager,
    ArtTokenConfigManager,
    ArtTokenRoyalty,
    CurrencyTransfers
{
    using TokenConfig for TokenConfig.Type;
    using TokenMintingPermit for TokenMintingPermit.Type;

    /// @notice Address of the accompanying AuctionHouse contract.
    IAuctionHouse public immutable AUCTION_HOUSE;

    /**
     * @notice Initializes the implementation with the given immutable parameters.
     * @param proxy Address of the proxy that will ultimately own the implementation
     *              (used for EIP-712 domain separator).
     * @param main Address that will be set as {RoleSystem.MAIN}.
     * @param wrappedEther Address of the Wrapped Ether contract.
     * @param auctionHouse Address of the AuctionHouse contract.
     */
    constructor(
        address proxy,
        address main,
        address wrappedEther,
        address auctionHouse
    ) EIP712Domain(proxy, "ArtToken", "1") RoleSystem(main) CurrencyTransfers(wrappedEther) {
        if (auctionHouse == address(0)) revert ArtTokenMisconfiguration(2);

        AUCTION_HOUSE = IAuctionHouse(auctionHouse);
    }

    /**
     * @notice Mints `tokenId` and transfers it to `to`.
     * @param to Address that will receive the newly minted token.
     * @param tokenId Unique identifier of the token to mint.
     * @param _tokenURI Metadata URI that will be associated with the token.
     * @param tokenConfig The configuration for the token, including creator and regulation mode.
     */
    function safeMintFromAuctionHouse(
        address to,
        uint256 tokenId,
        string calldata _tokenURI,
        TokenConfig.Type calldata tokenConfig
    ) external {
        if (msg.sender != address(AUCTION_HOUSE)) {
            revert ArtTokenUnauthorizedAccount(msg.sender);
        }

        _safeMintAndSetTokenConfig(to, tokenId, _tokenURI, tokenConfig);
    }

    /**
     * @notice Mints a new token according to the specifications in `permit`.
     * @param permit The minting details.
     * @param permitSignature The EIP-712 signature of the `permit` signed by the art-token signer.
     */
    function mint(TokenMintingPermit.Type calldata permit, bytes calldata permitSignature) external payable {
        _requireAuthorizedAction(permit.hash(), permit.deadline, permitSignature);

        permit.tokenConfig.requirePopulated();

        if (permit.minter != msg.sender) {
            revert ArtTokenUnauthorizedAccount(msg.sender);
        }

        if (permit.price == 0) {
            revert ArtTokenZeroPrice();
        }

        if (AUCTION_HOUSE.tokenReserved(permit.tokenId)) {
            revert ArtTokenTokenReservedByAuction();
        }

        if (!_currencyAllowed(permit.currency)) {
            revert ArtTokenUnsupportedCurrency();
        }

        _receiveCurrency(permit.currency, msg.sender, permit.price + permit.fee);

        _sendCurrency(permit.currency, _uniqueRoleOwner(Roles.FINANCIAL_ROLE), permit.fee);

        _sendCurrencyBatch(permit.currency, permit.price, permit.participants, permit.rewards);

        _safeMintAndSetTokenConfig(permit.minter, permit.tokenId, permit.tokenURI, permit.tokenConfig);
    }

    /**
     * @notice Sets the token URI for a given token.
     * @dev Can only be called by an account with the `ADMIN_ROLE`.
     * @param tokenId The ID of the token to update.
     * @param _tokenURI The new token URI.
     */
    function setTokenURI(uint256 tokenId, string calldata _tokenURI) external onlyRole(Roles.ADMIN_ROLE) {
        if (!_tokenExists(tokenId)) {
            revert ArtTokenNonexistentToken(tokenId);
        }

        _setTokenURI(tokenId, _tokenURI);
    }

    /**
     * @notice Returns whether `tokenId` has already been minted.
     * @param tokenId Token identifier to query.
     * @return exists True if the token exists.
     */
    function tokenExists(uint256 tokenId) external view returns (bool exists) {
        return _tokenExists(tokenId);
    }

    /**
     * @notice Checks whether `account` passes the collection's compliance rules.
     * @param account The address to check for compliance.
     * @return compliant True if the account is compliant with the collection's rules.
     */
    function accountCompliant(address account) external view returns (bool compliant) {
        return _accountCompliant(account);
    }

    /**
     * @notice Mints `tokenId` and transfers it to `to`, then sets the token URI and configuration.
     * @param to The address that will receive the newly minted token.
     * @param tokenId The unique identifier of the token to mint.
     * @param _tokenURI The metadata URI that will be associated with the token.
     * @param tokenConfig The configuration for the token.
     */
    function _safeMintAndSetTokenConfig(
        address to,
        uint256 tokenId,
        string calldata _tokenURI,
        TokenConfig.Type calldata tokenConfig
    ) private {
        _safeMintAndSetTokenURI(to, tokenId, _tokenURI);
        _setTokenConfig(tokenId, tokenConfig);
    }

    /**
     * @notice Returns whether `tokenId` has already been minted.
     * @param tokenId Token identifier to query.
     * @return exists True if the token exists.
     */
    function _tokenExists(uint256 tokenId) private view returns (bool exists) {
        return _ownerOf(tokenId) != address(0);
    }

    /**
     * @notice Checks whether `account` passes the collection's compliance rules.
     * @dev This function checks if the account is an EOA or has the PARTNER_ROLE.
     * @param account The address to check for compliance.
     * @return compliant True if the account is compliant with the collection's rules.
     */
    function _accountCompliant(address account) private view returns (bool compliant) {
        return account.code.length == 0 || _hasRole(Roles.PARTNER_ROLE, account);
    }

    /**
     * @notice Checks whether `account` passes the collection's compliance rules.
     * @dev Reverts if the account is not compliant with the collection's rules.
     * @param account The address to check for authorization.
     */
    function _requireCompliantAccount(address account) private view {
        if (!_accountCompliant(account)) {
            revert ArtTokenNonCompliantAccount(account);
        }
    }

    /**
     * @inheritdoc ArtTokenBase
     * @dev Hook that ensures both the recipient and the authorizing address are compliant with
     *      the collection's rules before any token transfer occurs.
     */
    function _beforeTransfer(address to, uint256 tokenId, address auth) internal view override(ArtTokenBase) {
        if (_tokenRegulationMode(tokenId) == TokenConfig.RegulationMode.Regulated) {
            _requireCompliantAccount(to);
            _requireCompliantAccount(auth);
        }
    }

    /**
     * @inheritdoc ArtTokenBase
     * @dev Hook that ensures the recipient of an approval is compliant with the collection's
     *      rules.
     */
    function _beforeApprove(address to, uint256 tokenId) internal view override(ArtTokenBase) {
        if (_tokenRegulationMode(tokenId) == TokenConfig.RegulationMode.Regulated) {
            _requireCompliantAccount(to);
        }
    }

    /**
     * @inheritdoc ArtTokenBase
     * @dev Hook that ensures a new operator is compliant with the collection's rules before
     *      being approved.
     */
    function _beforeSetApprovalForAll(address operator, bool approved) internal view override(ArtTokenBase) {
        if (approved) {
            _requireCompliantAccount(operator);
        }
    }
}
