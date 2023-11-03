// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721Enumerable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "./errors/TokenErrors.sol";

/**
 * @title Token
 *
 * @notice Token is ERC721(Enumerable, URIStorage) contract.
 * @notice Contract based on [OpenZeppelin](https://docs.openzeppelin.com/) library.
 */
contract Token is ERC721Enumerable, ERC721URIStorage {
    string constant public TOKEN_NAME = "Digital Original";
    string constant public TOKEN_SYMBOL = "DO";

    address public immutable MINTER;
    address public immutable MARKET;
    address public immutable AUCTION;

    /**
     * @dev Throws if called by any account other than the minter.
     */
    modifier onlyMinter() {
        if (msg.sender != MINTER) revert TokenUnauthorizedAccount(msg.sender);
        _;
    }

    /**
     * @param _minter Minter address.
     * @param _market TODO_DOC
     * @param _auction TODO_DOC
     */
    constructor(address _minter, address _market, address _auction) ERC721(TOKEN_NAME, TOKEN_SYMBOL) {
        MINTER = _minter;
        MARKET = _market;
        AUCTION = _auction;
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
     * TODO_DOC
     *
     * @dev Only owner can invoke the method.
     * @dev This method provides the ability to burn a token during 7 days after the token creation.
     *
     * @param tokenId Token ID.
     */
    function rollback(uint256 tokenId) external onlyMinter {
        _burn(tokenId);
    }

    function name() public pure override(ERC721) returns (string memory) {
        return TOKEN_NAME;
    }

    function symbol() public pure override(ERC721) returns (string memory) {
        return TOKEN_SYMBOL;
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
     * @dev Hook that is called during any token transfer.
     * TODO_DOC
     */
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override(ERC721, ERC721Enumerable) returns (address) {
        _validateTransfer(to);

        return ERC721Enumerable._update(to, tokenId, auth);
    }

    /**
     * TODO_DOC
     */
    function _validateTransfer(address to) internal view {
        if (to.code.length == 0) return;
        if (to == MARKET) return;
        if (to == AUCTION) return;

        revert NotTrustedReceiver(to);
    }

    /**
     * @dev An override required by Solidity.
     */
    function _increaseBalance(address account, uint128 amount) internal override(ERC721, ERC721Enumerable) {
        ERC721Enumerable._increaseBalance(account, amount);
    }
}
