// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
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
// TODO: Implement blacklist logic for unreliable markets
contract ArtToken is IArtToken, ArtTokenBase, EIP712 {
    using SafeERC20 for IERC20;

    bytes32 public constant BUY_PERMIT_TYPE_HASH =
        // prettier-ignore
        keccak256(
            "BuyPermit("
                "uint256 tokenId,"
                "string tokenURI,"
                "uint256 price,"
                "uint256 fee,"
                "address[] participants,"
                "uint256[] shares,"
                "uint256 deadline"
            ")"
        );

    address public immutable ADMIN;
    address public immutable PLATFORM;
    address public immutable AUCTION_HOUSE;
    IERC20 public immutable USDC;

    /**
     * @dev Throws if called by any account other than the minter.
     */
    modifier canMint() {
        if (msg.sender != AUCTION_HOUSE) {
            revert ArtTokenUnauthorizedAccount(msg.sender);
        }

        _;
    }

    /**
     * @param admin Minter address.
     * @param auctionHouse TODO_DOC
     */
    constructor(address admin, address platform, address auctionHouse, IERC20 usdc) EIP712("ArtToken", "1") {
        ADMIN = admin;
        PLATFORM = platform;
        AUCTION_HOUSE = auctionHouse;
        USDC = usdc;
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
     */
    function mint(address to, uint256 tokenId, string memory _tokenURI) external canMint {
        _mintAndSetTokenURI(to, tokenId, _tokenURI);
    }

    function buy(BuyParams calldata params) external {
        bytes32 structHash = keccak256(
            abi.encode(
                BUY_PERMIT_TYPE_HASH,
                params.tokenId,
                keccak256(bytes(params.tokenURI)),
                params.price,
                params.fee,
                keccak256(abi.encodePacked(params.participants)),
                keccak256(abi.encodePacked(params.shares)),
                params.deadline
            )
        );

        _requireValidSignature(ADMIN, structHash, params.deadline, params.signature);

        uint256 payment = params.price + params.fee;

        if (payment != 0) {
            USDC.safeTransferFrom(msg.sender, address(this), payment);
        }

        if (params.price != 0) {
            Distribution.safeDistribute(USDC, params.price, params.participants, params.shares);
        }

        if (params.fee != 0) {
            USDC.safeTransfer(PLATFORM, params.fee);
        }

        _mintAndSetTokenURI(msg.sender, params.tokenId, params.tokenURI);
    }
}
