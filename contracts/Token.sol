// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ERC721Wrapper} from "./utils/ERC721Wrapper.sol";
import {EIP712Wrapper} from "./utils/EIP712Wrapper.sol";
import {DistributionLibrary} from "./library/DistributionLibrary.sol";
import {IToken} from "./interfaces/IToken.sol";

/**
 * @title Token
 *
 * @notice Token is ERC721(Enumerable, URIStorage) contract.
 * @notice Contract based on [OpenZeppelin](https://docs.openzeppelin.com/) library.
 */
contract Token is IToken, ERC721Wrapper, EIP712Wrapper {
    bytes32 public constant MINT_AND_PAY_PERMIT_TYPE_HASH =
        keccak256(
            "MintAndPayPermit(address to,uint256 tokenId,string tokenURI,uint256 price,address[] participants,uint256[] shares,uint256 deadline)"
        );

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
    constructor(address _minter, address _market, address _auction) EIP712("Token", "1") {
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
        _safeMintAndSetTokenUri(to, tokenId, _tokenURI, data);
    }

    /**
     * @dev `to` should be EOA
     */
    function mintAndPay(
        address to,
        uint256 tokenId,
        uint256 price,
        uint256 deadline,
        string memory _tokenURI,
        address[] memory participants,
        uint256[] memory shares,
        bytes memory signature
    ) external payable {
        bytes32 structHash = keccak256(
            abi.encode(
                MINT_AND_PAY_PERMIT_TYPE_HASH,
                to,
                tokenId,
                keccak256(bytes(_tokenURI)),
                price,
                keccak256(abi.encodePacked(participants)),
                keccak256(abi.encodePacked(shares)),
                deadline
            )
        );

        _validateSignature(MINTER, structHash, deadline, signature);

        DistributionLibrary.validateShares(participants, shares);

        if (msg.sender != to) revert TokenUnauthorizedAccount(msg.sender);

        if (msg.value != price) revert TokenInsufficientPayment(msg.value);

        _mintAndSetTokenUri(to, tokenId, _tokenURI);

        DistributionLibrary.distribute(price, participants, shares);
    }

    // TODO: safeMint payable

    /**
     * @notice Burn a token.
     *
     * @dev Only owner can invoke the method.
     * @dev This method provides the ability to burn a token during 7 days after the token creation.
     *
     * @param tokenId Token ID.
     */
    function rollback(uint256 tokenId) external onlyMinter {
        _burn(tokenId);
    }

    /**
     * @dev Hook that is called during any token transfer.
     */
    function _update(address to, uint256 tokenId, address auth) internal override(ERC721Wrapper) returns (address) {
        _validateTransfer(to);

        return ERC721Wrapper._update(to, tokenId, auth);
    }

    function _validateTransfer(address to) internal view {
        if (to.code.length == 0) return;
        if (to == MARKET) return;
        if (to == AUCTION) return;

        revert TokenNotTrustedReceiver(to);
    }
}
