// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

interface IArtToken {
    function initialize() external;

    function safeMint(address to, uint256 tokenId, string memory _tokenURI, bytes memory data) external;

    function buy(
        uint256 tokenId,
        uint256 price,
        uint256 deadline,
        string memory _tokenURI,
        address[] memory participants,
        uint256[] memory shares,
        bytes memory signature
    ) external payable;

    function rollback(uint256 tokenId) external;

    error ArtTokenUnauthorizedAccount(address account);
    error ArtTokenNotTrustedReceiver(address receiver);
    error ArtTokenInsufficientPayment(uint256 amount);
}
