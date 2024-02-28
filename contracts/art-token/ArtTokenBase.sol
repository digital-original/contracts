// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {ERC721Upgradeable as ERC721} from "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import {ERC721URIStorageUpgradeable as ERC721URIStorage} from "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721URIStorageUpgradeable.sol";
import {ERC721EnumerableUpgradeable as ERC721Enumerable} from "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";

abstract contract ArtTokenBase is ERC721Enumerable, ERC721URIStorage {
    function _initialize(string memory _name, string memory _symbol) internal initializer {
        __ERC721_init(_name, _symbol);
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

    /**
     * @dev An override required by Solidity.
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
    function _increaseBalance(address account, uint128 amount) internal virtual override(ERC721, ERC721Enumerable) {
        ERC721Enumerable._increaseBalance(account, amount);
    }
}
