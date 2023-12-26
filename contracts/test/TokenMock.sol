// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721Enumerable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";

contract TokenMock is ERC721Enumerable {
    constructor() ERC721("Token Mock", "TM") {}

    function mint(address to, uint256 tokenId) external {
        _mint(to, tokenId);
    }
}
