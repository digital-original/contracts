// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.20;

import {TokenConfig} from "../../utils/TokenConfig.sol";

/**
 * @title AuctionCreationPermit
 *
 * @notice EIP-712 struct for an auction creation permit, which authorizes the creation of a new auction with
 *         specified parameters.
 */
library AuctionCreationPermit {
    using TokenConfig for TokenConfig.Type;

    /**
     * @notice Represents an auction creation permit.
     *
     * @param auctionId The ID of the auction to be created.
     * @param tokenId The ID of the token to be auctioned.
     * @param currency The token used for payment.
     * @param price The starting price of the auction.
     * @param fee The platform fee for the auction.
     * @param step The minimum bid increment for the auction.
     * @param endTime The timestamp when the auction ends.
     * @param tokenURI The metadata URI for the token.
     * @param tokenConfig The configuration for the token.
     * @param participants The addresses of the participants in the revenue share.
     * @param shares The corresponding shares for each participant.
     * @param deadline The timestamp until which the permit is valid.
     */
    struct Type {
        uint256 auctionId;
        uint256 tokenId;
        address currency;
        uint256 price;
        uint256 fee;
        uint256 step;
        uint256 endTime;
        string tokenURI;
        TokenConfig.Type tokenConfig;
        address[] participants;
        uint256[] shares;
        uint256 deadline;
    }

    /// @notice EIP-712 type hash for the {AuctionCreationPermit.Type} struct.
    // prettier-ignore
    bytes32 internal constant TYPE_HASH =
        keccak256(
            "AuctionCreationPermit("
                "uint256 auctionId,"
                "uint256 tokenId,"
                "address currency,"
                "uint256 price,"
                "uint256 fee,"
                "uint256 step,"
                "uint256 endTime,"
                "string tokenURI,"
                "bytes32 tokenConfig,"
                "address[] participants,"
                "uint256[] shares,"
                "uint256 deadline"
            ")"
        );

    /**
     * @notice Hashes an auction creation permit using the EIP-712 standard.
     *
     * @param permit The permit to hash.
     *
     * @return The EIP-712 hash of the permit.
     */
    function hash(Type calldata permit) internal pure returns (bytes32) {
        return
            keccak256(
                abi.encode(
                    TYPE_HASH,
                    permit.auctionId,
                    permit.tokenId,
                    permit.currency,
                    permit.price,
                    permit.fee,
                    permit.step,
                    permit.endTime,
                    keccak256(bytes(permit.tokenURI)),
                    permit.tokenConfig.hash(),
                    keccak256(abi.encodePacked(permit.participants)),
                    keccak256(abi.encodePacked(permit.shares)),
                    permit.deadline
                )
            );
    }
}
