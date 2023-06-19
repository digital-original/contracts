// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721Enumerable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IWhiteList} from "./interfaces/IWhiteList.sol";

/**
 * @title DOCollection
 * @notice DOCollection is ERC721(Enumerable, URIStorage) contract.
 * @notice Contract based on [OpenZeppelin](https://docs.openzeppelin.com/) library.
 */
contract DOCollection is ERC721Enumerable, ERC721URIStorage, Ownable {
    /**
     * @dev WhiteList contract address.
     */
    IWhiteList private _whiteList;

    /**
     * @param name Collection name
     * @param symbol Collection symbol
     * @param whiteList_ WhiteList contract address.
     */
    constructor(string memory name, string memory symbol, IWhiteList whiteList_) ERC721(name, symbol) {
        _whiteList = whiteList_;
    }

    /**
     * @param to Mint to address.
     * @param tokenId Token id.
     * @param _tokenURI Token metadata uri.
     * @dev Only owner can invoke method.
     */
    function mint(address to, uint256 tokenId, string memory _tokenURI) external onlyOwner {
        _mint(to, tokenId);
        _setTokenURI(tokenId, _tokenURI);
    }

    /**
     * @param to Mint to address.
     * @param tokenId Token id.
     * @param _tokenURI Token metadata uri.
     * @param data Bytes optional data to send along with the call.
     * @dev Only owner can invoke method.
     * @dev Method invokes `onERC721Received` if `to` is contract.
     *   See <https://docs.openzeppelin.com/contracts/2.x/api/token/erc721#IERC721Receiver>.
     */
    function safeMint(address to, uint256 tokenId, string memory _tokenURI, bytes memory data) external onlyOwner {
        _safeMint(to, tokenId, data);
        _setTokenURI(tokenId, _tokenURI);
    }

    /**
     * @notice Changes WhiteList contract address.
     * @param whiteList_ WhiteList contract address.
     * @dev Only owner can invoke method.
     */
    function whiteList(address whiteList_) external onlyOwner {
        require(whiteList_ != address(0), "DOCollection: invalid whitelist address");

        _whiteList = IWhiteList(whiteList_);
    }

    /**
     * @return WhiteList address.
     */
    function whiteList() external view returns (IWhiteList) {
        return _whiteList;
    }

    /**
     * @dev Hook that is called before any token transfer.
     */
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 firstTokenId,
        uint256 batchSize
    ) internal override(ERC721, ERC721Enumerable) {
        require(_whiteList.includes(to), "DOCollection: invalid receiver");

        return super._beforeTokenTransfer(from, to, firstTokenId, batchSize);
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
