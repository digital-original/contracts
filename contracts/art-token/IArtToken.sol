// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";

/**
 * @title IArtToken.
 *
 * @notice ArtToken contract interface.
 * @notice The interface extends ERC721 standard.
 */
interface IArtToken is IERC721 {
    /**
     * @notice Mints a new token.
     */
    function mint(address to, uint256 tokenId, string memory _tokenURI) external;

    /**
     * @dev Parameters for `buy` method
     */
    struct BuyParams {
        uint256 tokenId; // Token ID
        string tokenURI; // Token URI
        uint256 price; // Token price
        uint256 fee; // Platform fee
        address[] participants; // Participants for reward distribution
        uint256[] shares; // Shares for reward distribution
        bytes signature; // Permit signed by Admin
        uint256 deadline; // Signature expiration deadline in seconds
    }

    /**
     * @notice Mints a new token for a buyer and distributes rewards.
     */
    function buy(BuyParams calldata params) external;

    /**
     * @dev Returns true if the token is reserved.
     */
    function tokenReserved(uint256 tokenId) external view returns (bool);

    /**
     * @dev The caller account is not authorized.
     */
    error ArtTokenUnauthorizedAccount(address account);

    /**
     * @dev The token receiver is not valid.
     */
    error ArtTokenInvalidReceiver(address receiver);

    /**
     * @dev The token is reserved.
     */
    error ArtTokenReserved(uint256 tokenId);
}
