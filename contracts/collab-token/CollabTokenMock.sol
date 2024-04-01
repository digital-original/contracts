// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721Enumerable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";

contract CollabTokenMock is ERC721Enumerable {
    constructor() ERC721("CollabTokenMock", "CollabTokenMock") {}

    function mint(address to, uint256 tokenId, uint256 /* artTokenId */, uint256 /* guarantee */) external payable {
        _mint(to, tokenId);
    }
}