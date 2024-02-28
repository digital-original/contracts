// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {EIP712} from "../utils/EIP712.sol";
import {Distribution} from "../utils/Distribution.sol";
import {ArtTokenBase} from "./ArtTokenBase.sol";
import {IArtToken} from "./IArtToken.sol";

/**
 * @title Token
 *
 * @notice Token is ERC721(Enumerable, URIStorage) contract.
 * @notice Contract based on [OpenZeppelin](https://docs.openzeppelin.com/) library.
 */
contract ArtToken is IArtToken, ArtTokenBase, EIP712 {
    bytes32 public constant MINT_AND_PAY_PERMIT_TYPE_HASH =
        // prettier-ignore
        keccak256(
            "MintAndPayPermit("
                "address to,"
                "uint256 tokenId,"
                "string tokenURI,"
                "uint256 price,"
                "address[] participants,"
                "uint256[] shares,"
                "uint256 deadline"
            ")"
        );

    address public immutable MINTER;
    address public immutable MARKET;
    address public immutable AUCTION_HOUSE;

    /**
     * @dev Throws if called by any account other than the minter.
     */
    modifier onlyMinter() {
        if (msg.sender != MINTER) {
            revert ArtTokenUnauthorizedAccount(msg.sender);
        }

        _;
    }

    /**
     * @param minter Minter address.
     * @param market TODO_DOC
     * @param auctionHouse TODO_DOC
     */
    constructor(address minter, address market, address auctionHouse) EIP712("ArtToken", "1") {
        MINTER = minter;
        MARKET = market;
        AUCTION_HOUSE = auctionHouse;
    }

    function initialize() external {
        _initialize("Digital Original", "DO");
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

        if (msg.sender != to) {
            revert ArtTokenUnauthorizedAccount(msg.sender);
        }

        if (msg.value != price) {
            revert ArtTokenInsufficientPayment(msg.value);
        }

        _mintAndSetTokenUri(to, tokenId, _tokenURI);

        Distribution.validateShares(participants, shares);
        Distribution.distribute(price, participants, shares);
    }

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
    function _update(address to, uint256 tokenId, address auth) internal override(ArtTokenBase) returns (address) {
        _validateTransfer(to);

        return ArtTokenBase._update(to, tokenId, auth);
    }

    function _validateTransfer(address to) internal view {
        if (to.code.length == 0) return;
        if (to == AUCTION_HOUSE) return;
        if (to == MARKET) return;

        revert ArtTokenNotTrustedReceiver(to);
    }
}
