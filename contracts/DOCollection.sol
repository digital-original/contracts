// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721Enumerable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IWhiteList} from "./interfaces/IWhiteList.sol";

contract DOCollection is ERC721Enumerable, ERC721URIStorage, Ownable {
    IWhiteList private _whiteList;

    constructor(
        string memory name,
        string memory symbol,
        IWhiteList whiteList_
    ) ERC721(name, symbol) {
        _whiteList = whiteList_;
    }

    function mint(
        address to,
        uint256 tokenId,
        string calldata _tokenURI
    ) external onlyOwner {
        _mint(to, tokenId);
        _setTokenURI(tokenId, _tokenURI);
    }

    function safeMint(
        address to,
        uint256 tokenId,
        string calldata _tokenURI
    ) external {
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, _tokenURI);
    }

    function whiteList(address whiteList_) external onlyOwner {
        require(
            whiteList_ != address(0),
            "DOCollection: address zero is not valid WiteList"
        );
        require(
            whiteList_.code.length > 0,
            "DOCollection: EOA is not valid WiteList"
        );

        _whiteList = IWhiteList(whiteList_);
    }

    function whiteList() external view returns (IWhiteList) {
        return _whiteList;
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 firstTokenId,
        uint256 batchSize
    ) internal override(ERC721, ERC721Enumerable) {
        require(_whiteList.includes(to), "DOCollection: Invalid receiver");

        return
            ERC721Enumerable._beforeTokenTransfer(
                from,
                to,
                firstTokenId,
                batchSize
            );
    }

    // The following functions are overrides required by Solidity.

    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC721, ERC721Enumerable) returns (bool) {
        return ERC721Enumerable.supportsInterface(interfaceId);
    }

    function tokenURI(
        uint256 tokenId
    ) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return ERC721URIStorage.tokenURI(tokenId);
    }

    function _burn(
        uint256 tokenId
    ) internal virtual override(ERC721, ERC721URIStorage) {
        ERC721URIStorage._burn(tokenId);
    }
}
