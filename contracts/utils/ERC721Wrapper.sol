// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721Enumerable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

abstract contract ERC721Wrapper is ERC721Enumerable, ERC721URIStorage {
    string private constant NAME = "Digital Original";
    string private constant SYMBOL = "DO";

    constructor() ERC721("", "") {}

    function name() public pure override(ERC721) returns (string memory) {
        return NAME;
    }

    function symbol() public pure override(ERC721) returns (string memory) {
        return SYMBOL;
    }

    /**
     * @dev An override required by Solidity.
     */
    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return ERC721URIStorage.tokenURI(tokenId);
    }

    /**
     * @dev An override required by Solidity.
     */
    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC721Enumerable, ERC721URIStorage) returns (bool) {
        return ERC721Enumerable.supportsInterface(interfaceId) || ERC721URIStorage.supportsInterface(interfaceId);
    }

    function _safeMintAndSetTokenUri(address to, uint256 tokenId, string memory _tokenURI, bytes memory data) internal {
        _safeMint(to, tokenId, data);
        _setTokenURI(tokenId, _tokenURI);
    }

    function _mintAndSetTokenUri(address to, uint256 tokenId, string memory _tokenURI) internal {
        _mint(to, tokenId);
        _setTokenURI(tokenId, _tokenURI);
    }

    /**
     * @dev Hook that is called during any token transfer.
     * TODO_DOC
     */
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal virtual override(ERC721, ERC721Enumerable) returns (address) {
        return ERC721Enumerable._update(to, tokenId, auth);
    }

    /**
     * @dev An override required by Solidity.
     */
    function _increaseBalance(address account, uint128 amount) internal override(ERC721, ERC721Enumerable) {
        ERC721Enumerable._increaseBalance(account, amount);
    }
}
