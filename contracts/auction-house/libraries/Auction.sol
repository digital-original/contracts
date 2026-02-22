// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.20;

/**
 * @title Auction
 * @notice A library that defines the data structure for an auction.
 */
library Auction {
    /**
     * @notice Represents an auction for a single token.
     * @param tokenId The ID of the token being auctioned.
     * @param price The current price of the auction, which is the highest bid or starting price.
     * @param fee The platform fee for the auction.
     * @param step The minimum bid increment.
     * @param endTime The timestamp when the auction ends.
     * @param buyer The address of the current highest bidder.
     * @param sold A flag indicating whether the auction has been settled.
     * @param tokenURI The metadata URI for the token.
     * @param participants The addresses of the participants in the revenue share.
     * @param shares The corresponding shares for each participant.
     * @param currency The token used for payment.
     */
    struct Type {
        uint256 tokenId;
        uint256 price;
        uint256 fee;
        uint256 step;
        uint256 endTime;
        address buyer;
        bool sold;
        string tokenURI;
        address[] participants;
        uint256[] shares;
        address currency;
    }
}
