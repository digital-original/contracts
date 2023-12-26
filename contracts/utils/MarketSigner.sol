// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "../errors/MarketSignerErrors.sol";

/**
 * @title MarketSigner
 *
 * @notice Abstract contract MarketSigner provides signature validation logic.
 * @notice Contract based on [EIP712](https://eips.ethereum.org/EIPS/eip-712) standard.
 */

abstract contract MarketSigner is EIP712 {
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

    // /**
    //  * @dev Checks `deadline`, hashes data and recovers signature's signer,
    //  *   compares signer with market signer. Throws if data is valid.
    //  *
    //  * @param seller Seller address.
    //  * @param tokenId Token ID.
    //  * @param price Token price.
    //  * @param deadline Timestamp until which `signature` is valid.
    //  * @param participants Array with participants addresses.
    //  * @param shares Array with shares amounts.
    //  * @param signature Signature according to EIP712.
    //  */ TODO_DOC
    function _validateSignature(bytes32 structHash, uint256 deadline, bytes memory signature) internal view {
        if (block.timestamp > deadline) revert MarketSignerExpiredSignature(deadline);

        bytes32 hash = _hashTypedDataV4(structHash);
        address signer = ECDSA.recover(hash, signature);

        if (MARKET_SIGNER != signer) revert MarketSignerInvalidSigner(signer);
    }

    /**
     * @dev This empty reserved space.
     *
     * slot 1 - EIP712::_nameFallback
     * slot 2 - EIP712::_versionFallback
     */
    uint256[48] private __gap;
}
