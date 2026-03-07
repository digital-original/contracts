// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.20;

import {TokenConfig} from "../../utils/TokenConfig.sol";

/**
 * @title TokenMintingPermit
 * @notice EIP-712 struct for a token minting permit, which authorizes the minting of a new token with specified
 *         parameters.
 */
library TokenMintingPermit {
    using TokenConfig for TokenConfig.Type;

    /**
     * @notice Represents a token minting permit.
     * @param tokenId The ID of the token to be minted.
     * @param minter The address of the account that will mint the token.
     * @param currency The token used for payment.
     * @param price The price of the token for the primary sale.
     * @param fee The platform fee for the primary sale.
     * @param tokenURI The metadata URI for the token.
     * @param tokenConfig The configuration for the token, including creator and regulation mode.
     * @param participants The addresses of the participants in the revenue share.
     * @param rewards The corresponding rewards for each participant.
     * @param deadline The timestamp until which the permit is valid.
     */
    struct Type {
        uint256 tokenId;
        address minter;
        address currency;
        uint256 price;
        uint256 fee;
        string tokenURI;
        TokenConfig.Type tokenConfig;
        address[] participants;
        uint256[] rewards;
        uint256 deadline;
    }

    /// @notice EIP-712 type hash for the {TokenMintingPermit.Type} struct.
    // prettier-ignore
    bytes32 internal constant TYPE_HASH =
        keccak256(
            "TokenMintingPermit("
                "uint256 tokenId,"
                "address minter,"
                "address currency,"
                "uint256 price,"
                "uint256 fee,"
                "string tokenURI,"
                "bytes32 tokenConfig,"
                "address[] participants,"
                "uint256[] rewards,"
                "uint256 deadline"
            ")"
        );

    /**
     * @notice Hashes a token minting permit using the EIP-712 standard.
     * @param permit The permit to hash.
     * @return The EIP-712 hash of the permit.
     */
    function hash(Type calldata permit) internal pure returns (bytes32) {
        return
            keccak256(
                abi.encode(
                    TYPE_HASH,
                    permit.tokenId,
                    permit.minter,
                    permit.currency,
                    permit.price,
                    permit.fee,
                    keccak256(bytes(permit.tokenURI)),
                    permit.tokenConfig.hash(),
                    keccak256(abi.encodePacked(permit.participants)),
                    keccak256(abi.encodePacked(permit.rewards)),
                    permit.deadline
                )
            );
    }
}
