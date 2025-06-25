// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.20;

import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/**
 * @title EIP712Signature
 *
 * @notice Lightweight helper for recovering the signer of an EIP-712 typed-data signature.
 *         Combines OpenZeppelin's {ECDSA} and {MessageHashUtils}.
 *
 * @dev Reverts with {EIP712SignatureZeroAddress} if signature recovery yields the zero address
 *      (which indicates an invalid signature).
 */
library EIP712Signature {
    /**
     * @notice Recovers the signer of an EIP-712 `{structHash}` bound to the provided
     *         `domainSeparator`.
     *
     * @param domainSeparator The domain separator used when signing.
     * @param structHash Hash of the typed data structure being signed.
     * @param signature 65/64-byte ECDSA signature produced by the signer.
     *
     * @return signer Address that produced the signature.
     */
    function recover(
        bytes32 domainSeparator,
        bytes32 structHash,
        bytes calldata signature
    ) internal pure returns (address signer) {
        bytes32 digest = MessageHashUtils.toTypedDataHash(domainSeparator, structHash);

        signer = ECDSA.recover(digest, signature);

        if (signer == address(0)) {
            revert EIP712SignatureZeroAddress();
        }
    }

    /// @dev Thrown when signature recovery returns the zero address.
    error EIP712SignatureZeroAddress();
}
