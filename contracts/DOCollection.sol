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
     * @dev Minter address. Minter can invoke `mint` and `safeMint`.
     */
    address private _minter;

    /**
     * @dev TransferChecker contract address.
     */
    ITransferChecker private _transferChecker;

    /**
     * @dev Mapping token ID to token creation date.
     */
    mapping(uint256 => uint256) private _tokenCreationDate;

    /**
     * @dev Throws if called by any account other than the minter.
     */
    modifier onlyMinter() {
        require(msg.sender == _minter, "DOCollection: caller is not the minter");
        _;
    }

    /**
     * @param transferChecker_ TransferChecker contract address.
     */
    constructor(address minter_, address transferChecker_) ERC721("DOCollection", "DO") {
        require(minter_ != address(0));
        require(transferChecker_ != address(0));
        _minter = minter_;
        _transferChecker = ITransferChecker(transferChecker_);
    }

    /**
     * @notice Mints new token.
     *
     * @dev Only minter can invoke the method.
     *
     * @param to Mint to address.
     * @param tokenId Token ID.
     * @param _tokenURI Token metadata uri.
     */
    function mint(address to, uint256 tokenId, string memory _tokenURI) external onlyMinter {
        _mint(to, tokenId);
        _setTokenURI(tokenId, _tokenURI);
    }

    /**
     * @notice Mints new token.
     *
     * @dev Only minter can invoke the method.
     * @dev Method invokes `onERC721Received` if `to` is contract.
     *   See <https://docs.openzeppelin.com/contracts/2.x/api/token/erc721#IERC721Receiver>.
     *
     * @param to Mint to address.
     * @param tokenId Token ID.
     * @param _tokenURI Token metadata uri.
     * @param data Bytes optional data to send along with the call.
     */
    function safeMint(address to, uint256 tokenId, string memory _tokenURI, bytes memory data) external onlyMinter {
        _safeMint(to, tokenId, data);
        _setTokenURI(tokenId, _tokenURI);
    }

    /**
     * @notice Burn a token.
     *
     * @dev Only owner can invoke the method.
     * @dev This method provides the ability to burn a token during 7 days after the token creation.
     *
     * @param tokenId Token ID.
     */
    function burn(uint256 tokenId) external onlyOwner {
        // `ERC721::_burn` checks if a token exists.

        require(block.timestamp - _tokenCreationDate[tokenId] <= 7 days, "DOCollection: token can not be burned");

        _burn(tokenId);

        /**
         * No need to reset `_tokenCreationDate`
         * since tokenCreationDate request fails
         * if token does not exist.
         */
    }

    /**
     * @notice Changes minter address.
     *
     * @dev Only owner can invoke the method.
     *
     * @param minter_ New minter address.
     */
    function minter(address minter_) external onlyOwner {
        require(minter_ != address(0));
        // TODO: should emit an event
        _minter = minter_;
    }

    /**
     * @notice Changes TransferChecker contract address.
     *
     * @dev Only owner can invoke the method.
     *
     * @param transferChecker_ New TransferChecker contract address.
     */
    function transferChecker(address transferChecker_) external onlyOwner {
        require(transferChecker_ != address(0));
        // TODO: should emit an event
        _transferChecker = ITransferChecker(transferChecker_);
    }

    /**
     * @return Minter address.
     */
    function minter() external view returns (address) {
        return _minter;
    }

    /**
     * @return TransferChecker address.
     */
    function transferChecker() external view returns (ITransferChecker) {
        return _transferChecker;
    }

    /**
     * @notice Returns token creation date by token ID.
     *
     * @dev Throws if token does not exist.
     *
     * @param tokenId Token ID.
     *
     * @return Token creation date.
     */
    function tokenCreationDate(uint256 tokenId) external view returns (uint256) {
        _requireMinted(tokenId);
        return _tokenCreationDate[tokenId];
    }

    /**
     * @dev The method overrides `ERC721::_mint` to include logic with a token creation date
     */
    function _mint(address to, uint256 tokenId) internal override(ERC721) {
        super._mint(to, tokenId);
        _tokenCreationDate[tokenId] = block.timestamp;
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
    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
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
    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }
}
