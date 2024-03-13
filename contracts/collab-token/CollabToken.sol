// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721Enumerable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import {Address} from "@openzeppelin/contracts/utils/Address.sol";
import {ICollabToken} from "./ICollabToken.sol";

contract CollabToken is ERC721Enumerable, ICollabToken {
    address public immutable ART_TOKEN;
    address public immutable AUCTION_HOUSE;

    mapping(uint256 => Agreement) private agreements;

    constructor(address artToken, address auctionHouse) ERC721("DO Collaboration", "DOC") {
        ART_TOKEN = artToken;
        AUCTION_HOUSE = auctionHouse;
    }

    modifier onlyArtToken() {
        if (msg.sender != ART_TOKEN) {
            revert CollabTokenUnauthorizedAccount(msg.sender);
        }

        _;
    }

    modifier onlyOwner(uint256 tokenId) {
        if (msg.sender != ownerOf(tokenId)) {
            revert CollabTokenUnauthorizedAccount(msg.sender);
        }

        _;
    }

    function mint(address to, uint256 tokenId, uint256 artTokenId, uint256 guarantee) external payable onlyArtToken {
        _mint(to, tokenId);

        agreements[tokenId] = Agreement(artTokenId, guarantee);
    }

    function burn(uint256 tokenId) external onlyOwner(tokenId) {
        uint256 artTokenId = agreements[tokenId].artTokenId;

        if (ERC721(ART_TOKEN).ownerOf(artTokenId) == AUCTION_HOUSE) {
            revert AgreementNotFulfilled(tokenId, artTokenId);
        }

        _burn(tokenId);

        uint256 guarantee = agreements[tokenId].guarantee;

        delete agreements[tokenId];

        Address.sendValue(payable(msg.sender), guarantee);
    }

    function agreement(uint256 tokenId) external view returns (Agreement memory) {
        _requireOwned(tokenId);

        return agreements[tokenId];
    }
}
