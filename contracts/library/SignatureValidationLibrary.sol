// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

library SignatureValidationLibrary {
    error SignatureValidationLibraryExpiredSignature();
    error SignatureValidationLibraryInvalidSigner();

    function validateSignature(address signer, bytes32 hash, uint256 deadline, bytes memory signature) internal view {
        if (block.timestamp > deadline) revert SignatureValidationLibraryExpiredSignature();

        address recoveredSigner = ECDSA.recover(hash, signature);

        if (recoveredSigner != signer) revert SignatureValidationLibraryInvalidSigner();
    }
}
