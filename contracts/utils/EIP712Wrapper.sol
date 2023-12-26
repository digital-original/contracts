// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

abstract contract EIP712Wrapper is EIP712 {
    error EIP712WrapperExpiredSignature();
    error EIP712WrapperInvalidSigner();

    function _validateSignature(
        address signer,
        bytes32 structHash,
        uint256 deadline,
        bytes memory signature
    ) internal view {
        if (block.timestamp > deadline) revert EIP712WrapperExpiredSignature();

        bytes32 digest = _hashTypedDataV4(structHash);
        address recovered = ECDSA.recover(digest, signature);

        if (recovered != signer) revert EIP712WrapperInvalidSigner();
    }

    /**
     * @dev This empty reserved space.
     *
     * slot #1 - EIP712::_nameFallback
     * slot #2 - EIP712::_versionFallback
     */
    uint256[18] private __gap;
}
