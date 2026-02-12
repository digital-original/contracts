// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.20;

/**
 * @title EIP712Domain
 *
 * @notice Minimal helper that constructs an EIP-712 domain separator once at deployment time and
 *         exposes it as an immutable constant.
 *
 * @dev Designed to be inherited by contracts that need typed-data signatures. Follows the standard
 *      domain schema:
 *      `EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)`.
 */
contract EIP712Domain {
    /**
     * @dev Type-hash of the canonical EIP-712 domain.
     */
    // prettier-ignore
    bytes32 public constant DOMAIN_TYPE_HASH =
        keccak256(
            "EIP712Domain("
                "string name,"
                "string version,"
                "uint256 chainId,"
                "address verifyingContract"
            ")"
        );

    /**
     * @notice Fully-qualified EIP-712 domain separator for this contract.
     */
    bytes32 public immutable DOMAIN_SEPARATOR;

    /**
     * @notice Contract constructor.
     *
     * @param verifyingContract Address of the contract that will verify signatures (usually the proxy).
     * @param name Human-readable name of the signing domain.
     * @param version Current major version of the signing domain.
     */
    constructor(address verifyingContract, string memory name, string memory version) {
        if (verifyingContract == address(0)) revert EIP712DomainMisconfiguration(0);
        if (bytes(name).length == 0) revert EIP712DomainMisconfiguration(1);
        if (bytes(version).length == 0) revert EIP712DomainMisconfiguration(2);

        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                DOMAIN_TYPE_HASH,
                keccak256(bytes(name)),
                keccak256(bytes(version)),
                block.chainid,
                verifyingContract
            )
        );
    }

    /**
     * @dev Thrown when a constructor argument at position `argIndex` is invalid (zero address or
     *      empty string).
     */
    error EIP712DomainMisconfiguration(uint8 argIndex);
}
