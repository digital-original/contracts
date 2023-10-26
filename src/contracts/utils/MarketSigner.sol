// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {Upgradeable} from "./Upgradeable.sol";
import {IMarketSignerErrors} from "../interfaces/IMarketSignerErrors.sol";

/**
 * @title MarketSigner
 *
 * @notice Abstract contract MarketSigner provides signature validation logic.
 * @notice Contract based on [EIP712](https://eips.ethereum.org/EIPS/eip-712) standard.
 */

abstract contract MarketSigner is Upgradeable, EIP712, IMarketSignerErrors {
    /**
     * @dev Data type hash according to EIP712.
     */
    // prettier-ignore
    bytes32 public constant ORDER_TYPE_HASH =
        keccak256(
            "Order("
                "address seller,"
                "uint256 tokenId,"
                "uint256 price,"
                "address[] participants,"
                "uint256[] shares,"
                "uint256 deadline"
            ")"
        );

    /**
     * @dev Order signer address.
     */
    address public immutable MARKET_SIGNER;

    /**
     * @param marketSigner Order signer address.
     * @param eip712Name Domain name according to EIP712, no more than 31 bytes.
     * @param eip712Version Domain version according to EIP712, no more than 31 bytes.
     */
    constructor(
        address marketSigner,
        string memory eip712Name,
        string memory eip712Version
    ) EIP712(eip712Name, eip712Version) {
        MARKET_SIGNER = marketSigner;
    }

    /**
     * @dev Initializes contract.
     *   See <https://docs.openzeppelin.com/contracts/4.x/upgradeable#multiple-inheritance>.
     */
    function __MarketSigner_init() internal onlyInitializing {
        __MarketSigner_init_unchained();
    }

    /**
     * @dev Initializes contract.
     *   See <https://docs.openzeppelin.com/contracts/4.x/upgradeable#multiple-inheritance>.
     */
    function __MarketSigner_init_unchained() internal onlyInitializing {}

    /**
     * @dev Checks `deadline`, hashes data and recovers signature's signer,
     *   compares signer with market signer. Throws if data is valid.
     *
     * @param seller Seller address.
     * @param tokenId Token ID.
     * @param price Token price.
     * @param deadline Timestamp until which `signature` is valid.
     * @param participants Array with participants addresses.
     * @param shares Array with shares amounts.
     * @param signature Signature according to EIP712.
     */
    function _validateSignature(
        address seller,
        uint256 tokenId,
        uint256 price,
        uint256 deadline,
        address[] memory participants,
        uint256[] memory shares,
        bytes memory signature
    ) internal view {
        if (deadline < block.timestamp) revert MarketSignerSignatureExpired(deadline, block.timestamp);

        bytes32 hash = _hashTypedDataV4(
            keccak256(
                abi.encode(
                    ORDER_TYPE_HASH,
                    seller,
                    tokenId,
                    price,
                    keccak256(abi.encodePacked(participants)),
                    keccak256(abi.encodePacked(shares)),
                    deadline
                )
            )
        );

        if (MARKET_SIGNER != ECDSA.recover(hash, signature)) revert MarketSignerUnauthorized();
    }

    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     *   variables without shifting down storage in the inheritance chain.
     *   See <https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps>.
     */
    uint256[48] private __gap;
}
