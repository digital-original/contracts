// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/**
 * @title EIP712
 *
 * @notice The contract provides signature verification functionality built according
 * to [EIP712](https://eips.ethereum.org/EIPS/eip-712) standard.
 */
abstract contract EIP712 {
    bytes32 private constant EIP712_TYPE_HASH =
        // prettier-ignore
        keccak256(
            "EIP712Domain("
                "string name,"
                "string version,"
                "uint256 chainId,"
                "address verifyingContract"
            ")"
        );

    bytes32 private immutable HASHED_NAME;
    bytes32 private immutable HASHED_VERSION;

    /**
     * @dev `name` and `version` according to EIP712
     */
    constructor(string memory name, string memory version) {
        HASHED_NAME = keccak256(bytes(name));
        HASHED_VERSION = keccak256(bytes(version));
    }

    /**
     * @dev Throws if a signature is invalid.
     *
     * @param signer Expected signer.
     * @param structHash Hash of typed structured data, according to EIP712.
     * @param deadline Signature.
     * @param signature Signature built according to EIP712.
     */
    function _requireValidSignature(
        address signer,
        bytes32 structHash,
        uint256 deadline,
        bytes memory signature
    ) internal view {
        if (signer == address(0)) {
            revert EIP712SignerZeroAddress();
        }

        if (deadline < block.timestamp) {
            revert EIP712ExpiredSignature();
        }

        bytes32 digest = MessageHashUtils.toTypedDataHash(_buildDomainSeparator(), structHash);
        address recovered = ECDSA.recover(digest, signature);

        if (recovered != signer) {
            revert EIP712InvalidSignature();
        }
    }

    /**
     * @dev Builds the domain separator.
     */
    function _buildDomainSeparator() private view returns (bytes32) {
        return keccak256(abi.encode(EIP712_TYPE_HASH, HASHED_NAME, HASHED_VERSION, block.chainid, address(this)));
    }

    /**
     * @dev The signature expired.
     */
    error EIP712ExpiredSignature();

    /**
     * @dev The signature derives an invalid signer.
     */
    error EIP712InvalidSignature();

    /**
     * @dev The signer is invalid.
     */
    error EIP712SignerZeroAddress();
}
