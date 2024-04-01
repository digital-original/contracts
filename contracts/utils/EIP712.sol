// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

abstract contract EIP712 {
    error EIP712ExpiredSignature();
    error EIP712InvalidSignature();

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

    constructor(string memory name, string memory version) {
        HASHED_NAME = keccak256(bytes(name));
        HASHED_VERSION = keccak256(bytes(version));
    }

    function _requireValidSignature(
        address signer,
        bytes32 structHash,
        uint256 deadline,
        bytes memory signature
    ) internal view {
        if (deadline <= block.timestamp) {
            revert EIP712ExpiredSignature();
        }

        bytes32 digest = MessageHashUtils.toTypedDataHash(_buildDomainSeparator(), structHash);
        address recovered = ECDSA.recover(digest, signature);

        if (recovered != signer) {
            revert EIP712InvalidSignature();
        }
    }

    function _buildDomainSeparator() private view returns (bytes32) {
        return keccak256(abi.encode(EIP712_TYPE_HASH, HASHED_NAME, HASHED_VERSION, block.chainid, address(this)));
    }
}
