// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721Enumerable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import {ICollabToken} from "../collab-token/ICollabToken.sol";

contract ArtTokenMock is ERC721Enumerable {
    constructor() ERC721("ArtTokenMock", "ArtTokenMock") {}

    function mint(address to, uint256 tokenId) external {
        _mint(to, tokenId);
    }

    function mitCollabToken(
        ICollabToken collabToken,
        address to,
        uint256 collabTokenId,
        uint256 artTokenId,
        uint256 guarantee
    ) external payable {
        collabToken.mint{value: msg.value}(to, collabTokenId, artTokenId, guarantee);
    }
}
