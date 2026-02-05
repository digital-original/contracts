// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.20;

import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";

/**
 * @title IArtToken
 *
 * @notice Interface of the DigitalOriginal ERC-721 ArtToken contracts.
 * @notice Extends the ERC-721 standard with primary-sale logic, EIP-712 permits and
 *         compliance helpers used by the protocol.
 */
interface IArtToken is IERC721 {
    /**
     * @notice Parameters accepted by {buy}.
     *
     * @param tokenId      Identifier of the token to be minted and purchased.
     * @param tokenURI     Metadata URI that will be permanently associated with the token.
     * @param price        Total purchase price denominated in the settlement token (USDC).
     * @param fee          Platform fee that will be additionally charged to the buyer.
     * @param participants Addresses that will receive a portion of `price`.
     * @param shares       Number of shares assigned to each participant; must sum to
     *                     {Distribution.TOTAL_SHARE} in the implementation.
     * @param signature    EIP-712 signature issued by the trusted signer authorizing the purchase.
     * @param deadline     Latest UNIX timestamp at which the signature remains valid.
     */
    struct BuyParams {
        uint256 tokenId;
        string tokenURI;
        uint256 price;
        uint256 fee;
        address[] participants;
        uint256[] shares;
        bytes signature;
        uint256 deadline;
    }

    /**
     * @notice Mints `tokenId` and transfers it to `to`.
     *
     * @param to        Address that will receive the newly minted token.
     * @param tokenId   Unique identifier of the token to mint.
     * @param _tokenURI Metadata URI that will be associated with the token.
     */
    function mint(address to, uint256 tokenId, string memory _tokenURI) external;

    /**
     * @notice Primary sale helper: mints the token and immediately transfers it to the caller.
     *
     * @param params See {BuyParams}.
     */
    function buy(BuyParams calldata params) external;

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
     * @param account Address to query.
     * @return authorized True if the account can receive or manage tokens.
     */
    function recipientAuthorized(address account) external view returns (bool authorized);

    /// @dev Thrown when an action involves an account that is not authorized by the contract rules.
    error ArtTokenUnauthorizedAccount(address account);

    /// @dev Thrown when an empty string is passed as a token URI where a non-empty value is required.
    error ArtTokenEmptyTokenURI();

    /// @dev Thrown when `price` supplied to {buy} is below the minimum configured price.
    error ArtTokenInvalidPrice();

    /// @dev Thrown when `fee` supplied to {buy} is below the minimum configured fee.
    error ArtTokenInvalidFee();

    /// @dev Thrown when attempting to mint or purchase a token that is already owned / reserved.
    error ArtTokenTokenReserved();

    /// @dev Thrown when a constructor argument under the provided `argIndex` is invalid (e.g., zero address).
    error ArtTokenMisconfiguration(uint256 argIndex);
}
