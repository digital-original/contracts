// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.20;

import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {TokenConfig} from "../utils/TokenConfig.sol";
import {TokenMintingPermit} from "./libraries/TokenMintingPermit.sol";

/**
 * @title IArtToken
 * @notice Interface of the DigitalOriginal ERC-721 ArtToken contracts.
 */
interface IArtToken is IERC721 {
    /**
     * @notice Mints `tokenId` and transfers it to `to`.
     * @param to Address that will receive the newly minted token.
     * @param tokenId Unique identifier of the token to mint.
     * @param tokenURI Metadata URI that will be associated with the token.
     * @param tokenConfig The configuration for the token, including creator and regulation mode.
     */
    function safeMintFromAuctionHouse(
        address to,
        uint256 tokenId,
        string memory tokenURI,
        TokenConfig.Type calldata tokenConfig
    ) external;

    /**
     * @notice Mints a new token with `tokenId` to `msg.sender`. The minting details are specified in the `permit`,
     *         which is signed by an authorized art-token signer.
     * @param permit The `TokenMintingPermit` struct containing the minting details.
     * @param permitSignature The EIP-712 signature of the `permit` signed by an authorized art-token signer.
     */
    function mint(TokenMintingPermit.Type calldata permit, bytes calldata permitSignature) external payable;

    /**
     * @notice Sets the token URI for a given token.
     * @param tokenId The ID of the token to update.
     * @param _tokenURI The new token URI.
     */
    function setTokenURI(uint256 tokenId, string memory _tokenURI) external;

    /**
     * @notice Returns whether `tokenId` has already been minted.
     * @param tokenId Token identifier to query.
     * @return exists True if the token exists.
     */
    function tokenExists(uint256 tokenId) external view returns (bool exists);

    /**
     * @notice Checks whether `account` passes the collection's compliance rules.
     * @param account The address to check for compliance.
     * @return compliant True if the account is compliant with the collection's rules.
     */
    function accountCompliant(address account) external view returns (bool compliant);

    /// @dev Thrown when an action involves an account that is not authorized by the contract rules.
    /// @param account The unauthorized account involved in the action.
    error ArtTokenUnauthorizedAccount(address account);

    /// @dev Thrown when an action involves an account that does not comply with the collection's rules.
    /// @param account The non-compliant account involved in the action.
    error ArtTokenNonCompliantAccount(address account);

    /// @dev Thrown when a token does not exist.
    /// @param tokenId The identifier of the nonexistent token.
    error ArtTokenNonexistentToken(uint256 tokenId);

    /// @dev Thrown when the currency specified is not supported.
    error ArtTokenUnsupportedCurrency();

    /// @dev Thrown when the `price` provided is zero.
    error ArtTokenZeroPrice();

    /// @dev Thrown when attempting to mint or purchase a token that is reserved by an auction.
    error ArtTokenTokenReservedByAuction();

    /// @dev Thrown when a constructor argument is invalid.
    /// @param argIndex The index of the invalid constructor argument.
    error ArtTokenMisconfiguration(uint8 argIndex);
}
