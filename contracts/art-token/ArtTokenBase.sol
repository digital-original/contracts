// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.20;

import {ERC721Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import {ERC721URIStorageUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721URIStorageUpgradeable.sol";
import {ERC721EnumerableUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";

/**
 * @title ArtTokenBase
 *
 * @notice Abstract contract provides a basic, upgradeable implementation of the ERC721 standard.
 * @notice The implementation is based on [OpenZeppelin](https://docs.openzeppelin.com/) library
 * and includes Enumerable and URIStorage extensions.
 */
abstract contract ArtTokenBase is ERC721EnumerableUpgradeable, ERC721URIStorageUpgradeable {
    /**
     * @dev Initializes the contract by setting a `name` and a `symbol`.
     */
    function _initialize(string memory _name, string memory _symbol) internal initializer {
        __ERC721_init(_name, _symbol);
    }

    /**
     * @dev Mints `tokenId` and transfers it to `to`. Sets `_tokenURI` as the tokenURI of `tokenId`.
     */
    function _mintAndSetTokenURI(address to, uint256 tokenId, string memory _tokenURI) internal {
        _mint(to, tokenId);
        _setTokenURI(tokenId, _tokenURI);
    }

    /**
     * @dev An override required by Solidity.
     */
    function tokenURI(
        uint256 tokenId
    ) public view override(ERC721Upgradeable, ERC721URIStorageUpgradeable) returns (string memory) {
        return ERC721URIStorageUpgradeable.tokenURI(tokenId);
    }

    /**
     * @dev An override required by Solidity.
     */
    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC721EnumerableUpgradeable, ERC721URIStorageUpgradeable) returns (bool) {
        return
            ERC721EnumerableUpgradeable.supportsInterface(interfaceId) ||
            ERC721URIStorageUpgradeable.supportsInterface(interfaceId);
    }

    /**
     * @dev An override required by Solidity.
     */
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal virtual override(ERC721Upgradeable, ERC721EnumerableUpgradeable) returns (address) {
        return ERC721EnumerableUpgradeable._update(to, tokenId, auth);
    }

    /**
     * @dev An override required by Solidity.
     */
    function _increaseBalance(
        address account,
        uint128 amount
    ) internal virtual override(ERC721Upgradeable, ERC721EnumerableUpgradeable) {
        ERC721EnumerableUpgradeable._increaseBalance(account, amount);
    }
}
