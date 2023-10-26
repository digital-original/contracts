// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721Enumerable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {ITokenErrors} from "./interfaces/ITokenErrors.sol";
import {ITransferChecker} from "./interfaces/ITransferChecker.sol";

/**
 * @title Token
 *
 * @notice Token is ERC721(Enumerable, URIStorage) contract.
 * @notice Contract based on [OpenZeppelin](https://docs.openzeppelin.com/) library.
 */
contract Token is ERC721Enumerable, ERC721URIStorage, Ownable2Step, ITokenErrors {
    /**
     * @dev Minter address. Minter can invoke `mint` and `safeMint`.
     */
    address public immutable MINTER;

    /**
     * TODO_DOC
     */
    address public immutable MARKET;

    /**
     * @dev Mapping token ID to token creation date.
     */
    mapping(uint256 => uint256) public tokenCreationDate;

    /**
     * @dev Throws if called by any account other than the minter.
     */
    modifier onlyMinter() {
        if (msg.sender != MINTER) revert TokenUnauthorizedAccount(msg.sender);
        _;
    }

    /**
     * @param _initialOwner Contract owner.
     * @param _minter Minter address.
     * @param _market TODO_DOC.
     */
    constructor(
        address _initialOwner,
        address _minter,
        address _market
    ) ERC721("Digital Original", "DO") Ownable(_initialOwner) {
        MINTER = _minter;
        MARKET = _market;
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
        _setTokenCreationDate(tokenId);
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
        _setTokenCreationDate(tokenId);
    }

    /**
     * @notice Burn a token.
     *
     * @dev Only owner can invoke the method.
     * @dev This method provides the ability to burn a token during 7 days after the token creation.
     *
     * @param tokenId Token ID.
     */
    function rollback(uint256 tokenId) external onlyOwner {
        // `ERC721::_burn` checks if a token exists.

        if (block.timestamp - tokenCreationDate[tokenId] > 7 days) revert TokenCannotBeBurned(tokenId);

        _burn(tokenId);

        // No need to reset `tokenCreationDate`
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
     * TODO_DOC
     */
    function _setTokenCreationDate(uint256 tokenId) internal {
        tokenCreationDate[tokenId] = block.timestamp;
    }

    /**
     * @dev Hook that is called during any token transfer.
     * @dev The method invokes `TransferChecker::check`.
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

        revert NotTrustedReceiver(to);
    }

    /**
     * @dev An override required by Solidity.
     */
    function _increaseBalance(address account, uint128 amount) internal override(ERC721, ERC721Enumerable) {
        ERC721Enumerable._increaseBalance(account, amount);
    }
}
