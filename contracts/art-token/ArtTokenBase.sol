// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.20;

import {ERC721Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import {ERC721URIStorageUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721URIStorageUpgradeable.sol";
import {ERC721EnumerableUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";

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
    function initialize(string memory _name, string memory _symbol) external initializer {
        __ERC721_init(_name, _symbol);
    }

    /**
     * @dev Mints `tokenId` and transfers it to `to`. Sets `_tokenURI` as the tokenURI of `tokenId`.
     */
    function _safeMintAndSetTokenURI(address to, uint256 tokenId, string memory _tokenURI) internal {
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, _tokenURI);
    }

    /**
     * @dev Overriding the hook. Adds `_beforeTransfer` hook for extending the token-transferring logic.
     */
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override(ERC721Upgradeable, ERC721EnumerableUpgradeable) returns (address) {
        _beforeTransfer(to, tokenId);

        return super._update(to, tokenId, auth);
    }

    /**
     * @dev Overriding the method. Adds `_beforeApprove` hook for extending the approval-providing logic.
     */
    function approve(address to, uint256 tokenId) public override(ERC721Upgradeable, IERC721) {
        _beforeApprove(to, tokenId);

        super.approve(to, tokenId);
    }

    /**
     * @dev Overriding the method. Adds `_beforeSetApprovalForAll` hook for extending
     *  the logic of approval-providing for all tokens.
     */
    function setApprovalForAll(address operator, bool approved) public override(ERC721Upgradeable, IERC721) {
        _beforeSetApprovalForAll(operator, approved);

        super.setApprovalForAll(operator, approved);
    }

    /**
     * @dev The hook to extend the token token-transferring logic.
     */
    function _beforeTransfer(address to, uint256 tokenId) internal virtual {}

    /**
     * @dev The hook to extend the approval-providing logic.
     */
    function _beforeApprove(address to, uint256 tokenId) internal virtual {}

    /**
     * @dev The hook to extend the logic of approval-providing for all tokens.
     */
    function _beforeSetApprovalForAll(address operator, bool approved) internal virtual {}

    /**
     * @dev An override required by Solidity.
     */
    function tokenURI(
        uint256 tokenId
    ) public view override(ERC721Upgradeable, ERC721URIStorageUpgradeable) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    /**
     * @dev An override required by Solidity.
     */
    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC721EnumerableUpgradeable, ERC721URIStorageUpgradeable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    /**
     * @dev An override required by Solidity.
     */
    function _increaseBalance(
        address account,
        uint128 amount
    ) internal override(ERC721Upgradeable, ERC721EnumerableUpgradeable) {
        super._increaseBalance(account, amount);
    }
}
