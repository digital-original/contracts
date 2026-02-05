// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.20;

import {ERC721Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import {
    ERC721URIStorageUpgradeable
} from "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721URIStorageUpgradeable.sol";
import {
    ERC721EnumerableUpgradeable
} from "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import {IERC165} from "@openzeppelin/contracts/interfaces/IERC165.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC2981} from "@openzeppelin/contracts/interfaces/IERC2981.sol";

/**
 * @title ArtTokenBase
 *
 * @notice Upgradeable, abstract ERC-721 implementation used as a building block for the
 *         protocol's ArtToken contracts. Relies on OpenZeppelin upgradeable libraries and
 *         bundles the Enumerable and URIStorage extensions in a single inheritance tree.
 */
abstract contract ArtTokenBase is ERC721EnumerableUpgradeable, ERC721URIStorageUpgradeable, IERC2981 {
    /**
     * @notice Initializes the token with a `name` and a `symbol`.
     *
     * @param _name Token collection name.
     * @param _symbol Token collection symbol.
     */
    function initialize(string memory _name, string memory _symbol) external initializer {
        __ERC721_init(_name, _symbol);
    }

    /**
     * @dev Overrides {ERC721.approve}. Adds the `_beforeApprove` hook so that inheriting contracts
     *      can introduce custom approval rules.
     */
    function approve(address to, uint256 tokenId) public override(ERC721Upgradeable, IERC721) {
        _beforeApprove(to, tokenId);

        super.approve(to, tokenId);
    }

    /**
     * @dev Overrides {ERC721.setApprovalForAll}. Adds the `_beforeSetApprovalForAll` hook so that
     *      inheriting contracts can introduce custom operator-approval rules.
     */
    function setApprovalForAll(address operator, bool approved) public override(ERC721Upgradeable, IERC721) {
        _beforeSetApprovalForAll(operator, approved);

        super.setApprovalForAll(operator, approved);
    }

    /**
     * @dev An override required by Solidity.
     */
    function tokenURI(
        uint256 tokenId
    ) public view override(ERC721Upgradeable, ERC721URIStorageUpgradeable) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    /**
     * @notice Returns true if the contract implements the interface defined by
     *         `interfaceId`. See the corresponding EIP-165 standard for more details.
     */
    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC721EnumerableUpgradeable, ERC721URIStorageUpgradeable, IERC165) returns (bool) {
        return interfaceId == type(IERC2981).interfaceId || super.supportsInterface(interfaceId);
    }

    /**
     * @dev Helper that performs a safe mint and assigns a token URI in a single call.
     *
     * @param to Recipient of the newly minted token.
     * @param tokenId Identifier of the token to mint.
     * @param _tokenURI Metadata URI that will be associated with the token.
     */
    function _safeMintAndSetTokenURI(address to, uint256 tokenId, string memory _tokenURI) internal {
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, _tokenURI);
    }

    /**
     * @dev Overrides the OpenZeppelin internal `_update` function in order to plug the
     *      `_beforeTransfer` hook.
     *
     * @param to Address receiving the token.
     * @param tokenId Identifier of the token being transferred.
     * @param auth Address whose approval is being used for the transfer
     *             (may be the the owner of the token or an operator).
     *
     * @return from Address that previously owned the token.
     */
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override(ERC721Upgradeable, ERC721EnumerableUpgradeable) returns (address from) {
        _beforeTransfer(to, tokenId, auth);

        return super._update(to, tokenId, auth);
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

    /**
     * @dev Hook called before any token transfer or mint.
     *
     * @param to The address receiving the token.
     * @param tokenId Identifier of the token being transferred.
     * @param auth Address whose approval is being used for the transfer.
     */
    function _beforeTransfer(address to, uint256 tokenId, address auth) internal virtual {}

    /**
     * @dev Hook called before an approval is granted for a single token.
     *
     * @param to Address that the approval will be granted to.
     * @param tokenId Identifier of the token for which the approval is set.
     */
    function _beforeApprove(address to, uint256 tokenId) internal virtual {}

    /**
     * @dev Hook called before an operator approval is changed for an account.
     *
     * @param operator Address whose operator status is being updated.
     * @param approved Boolean indicating whether the operator is being approved or revoked.
     */
    function _beforeSetApprovalForAll(address operator, bool approved) internal virtual {}
}
