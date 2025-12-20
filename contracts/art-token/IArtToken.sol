// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.20;

import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {TokenConfig} from "../utils/TokenConfig.sol";
import {TokenMintingPermit} from "./libraries/TokenMintingPermit.sol";

/**
 * @title IArtToken
 *
 * @notice Interface of the DigitalOriginal ERC-721 ArtToken contracts.
 */
interface IArtToken is IERC721 {
    /**
     * @notice Mints `tokenId` and transfers it to `to`.
     *
     * @param to Address that will receive the newly minted token.
     * @param tokenId Unique identifier of the token to mint.
     * @param _tokenURI Metadata URI that will be associated with the token.
     * @param tokenConfig The configuration for the token, including creator and regulation mode.
     */
    function mintFromAuctionHouse(
        address to,
        uint256 tokenId,
        string memory _tokenURI,
        TokenConfig.Type calldata tokenConfig
    ) external;

    /**
     * @notice Primary sale helper: mints the token and immediately transfers it to the caller.
     *
     * @param permit The `TokenMintingPermit` struct containing the sale details.
     * @param permitSignature The EIP-712 signature of the `permit`, signed by the art-token signer.
     */
    function mint(TokenMintingPermit.Type calldata permit, bytes calldata permitSignature) external payable;

    /**
     * @notice Sets the token URI for a given token.
     *
     * @param tokenId The ID of the token to update.
     * @param _tokenURI The new token URI.
     */
    function setTokenURI(uint256 tokenId, string memory _tokenURI) external;

    /**
     * @notice Returns whether `tokenId` has already been minted (i.e., is reserved).
     *
     * @param tokenId Token identifier to query.
     *
     * @return reserved True if the token exists, false otherwise.
     */
    function tokenReserved(uint256 tokenId) external view returns (bool reserved);

    /**
     * @notice Checks whether `account` passes the collection's compliance rules.
     *
     * @param account Address to query.
     *
     * @return authorized True if the account can receive or manage tokens.
     */
    function recipientAuthorized(address account) external view returns (bool authorized);

    /// @dev Thrown when an action involves an account that is not authorized by the contract rules.
    error ArtTokenUnauthorizedAccount(address account);

    /// @dev Thrown when a token does not exist.
    error ArtTokenNonexistentToken(uint256 tokenId);

    /// @dev Thrown when a currency is invalid.
    error ArtTokenCurrencyInvalid();

    /// @dev Thrown when `price` supplied to {buy} is below the minimum configured price.
    error ArtTokenInvalidPrice();

    /// @dev Thrown when `fee` supplied to {buy} is below the minimum configured fee.
    error ArtTokenInvalidFee();

    /// @dev Thrown when attempting to mint or purchase a token that is already owned / reserved.
    error ArtTokenTokenReserved();

    /// @dev Thrown when a constructor argument under the provided `argIndex` is invalid (e.g., zero address).
    error ArtTokenMisconfiguration(uint256 argIndex);
}
