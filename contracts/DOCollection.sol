// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721Enumerable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {ITransferChecker} from "./interfaces/ITransferChecker.sol";

/**
 * @title DOCollection
 *
 * @notice DOCollection is ERC721(Enumerable, URIStorage) contract.
 * @notice Contract based on [OpenZeppelin](https://docs.openzeppelin.com/) library.
 */

contract DOCollection is ERC721Enumerable, ERC721URIStorage, Ownable2Step {
    /**
     * @dev TransferChecker contract address.
     */
    ITransferChecker private _transferChecker;

    /**
     * @param name Collection name
     * @param symbol Collection symbol
     * @param transferChecker_ TransferChecker contract address.
     */
    constructor(string memory name, string memory symbol, ITransferChecker transferChecker_) ERC721(name, symbol) {
        _transferChecker = transferChecker_;
    }

    /**
     * @dev Only owner can invoke method.
     *
     * @param to Mint to address.
     * @param tokenId Token id.
     * @param _tokenURI Token metadata uri.
     */
    function mint(address to, uint256 tokenId, string memory _tokenURI) external onlyOwner {
        _mint(to, tokenId);
        _setTokenURI(tokenId, _tokenURI);
    }

    /**
     * @dev Only owner can invoke method.
     * @dev Method invokes `onERC721Received` if `to` is contract.
     *   See <https://docs.openzeppelin.com/contracts/2.x/api/token/erc721#IERC721Receiver>.
     *
     * @param to Mint to address.
     * @param tokenId Token id.
     * @param _tokenURI Token metadata uri.
     * @param data Bytes optional data to send along with the call.
     */
    function safeMint(address to, uint256 tokenId, string memory _tokenURI, bytes memory data) external onlyOwner {
        _safeMint(to, tokenId, data);
        _setTokenURI(tokenId, _tokenURI);
    }

    /**
     * @notice Changes TransferChecker contract address.
     *
     * @dev Only owner can invoke method.
     *
     * @param transferChecker_ TransferChecker contract address.
     */
    function transferChecker(ITransferChecker transferChecker_) external onlyOwner {
        _transferChecker = transferChecker_;
    }

    /**
     * @return TransferChecker address.
     */
    function transferChecker() external view returns (ITransferChecker) {
        return _transferChecker;
    }

    /**
     * @dev Hook that is called before any token transfer.
     * @dev The method invokes `TransferChecker::check`.
     */
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 firstTokenId,
        uint256 batchSize
    ) internal override(ERC721, ERC721Enumerable) {
        _transferChecker.check(from, to, firstTokenId);

        super._beforeTokenTransfer(from, to, firstTokenId, batchSize);
    }

    /**
     * @dev An override required by Solidity.
     */
    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC721Enumerable, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    /**
     * @dev An override required by Solidity.
     */
    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    /**
     * @dev An override required by Solidity.
     */
    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }
}
