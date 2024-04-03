// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

interface IArtToken {
    function initialize() external;

    function mint(address to, uint256 tokenId, string calldata tokenURI) external;

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

    function buy(BuyParams calldata params) external;

    error ArtTokenUnauthorizedAccount(address account);
}
