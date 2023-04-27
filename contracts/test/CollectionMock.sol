// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.16;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721Enumerable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";

contract CollectionMock is ERC721Enumerable {
    string private _collectionBaseURI;

    constructor(string memory collectionBaseURI) ERC721("Collection Mock", "CM") {
        _collectionBaseURI = collectionBaseURI;
    }

    function mint(address to, uint256 tokenId) external {
        _mint(to, tokenId);
    }

    function _baseURI() internal view override returns (string memory) {
        return _collectionBaseURI;
    }
}
