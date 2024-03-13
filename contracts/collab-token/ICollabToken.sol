// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

interface ICollabToken {
    struct Agreement {
        uint256 artTokenId;
        uint256 guarantee;
    }

    function mint(address to, uint256 tokenId, uint256 artTokenId, uint256 guarantee) external payable;

    function burn(uint256 tokenId) external;

    function agreement(uint256 tokenId) external view returns (Agreement memory);

    error CollabTokenUnauthorizedAccount(address account);
    error AgreementNotFulfilled(uint256 tokenId, uint256 artTokenId);
}
