// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.20;

/**
 * @title OrderExecutionPermit
 *
 * @notice EIP-712 struct for an order execution permit.
 */
library OrderExecutionPermit {
    /**
     * @param participants Revenue-sharing recipients.
     * @param shares Number of shares assigned to each participant.
     * @param deadline Expiration timestamp for the signature.
     */
    struct Type {
        /* bytes32 orderHash; */
        address[] participants;
        uint256[] shares;
        uint256 deadline;
    }

    /// @notice EIP-712 type hash for the {OrderExecutionPermit.Type} struct.
    // prettier-ignore
    bytes32 internal constant TYPE_HASH =
        keccak256(
            "OrderExecutionPermit("
                "bytes32 orderHash,"
                "address[] participants,"
                "uint256[] shares,"
                "uint256 deadline"
            ")"
        );

    /**
     * @notice Hashes an execution permit using the EIP-712 standard.
     *
     * @param permit The execution permit to hash.
     * @param orderHash The hash of the order to be executed.
     *
     * @return permitHash The EIP-712 hash of the permit.
     */
    function hash(Type calldata permit, bytes32 orderHash) internal pure returns (bytes32) {
        return
            keccak256(
                abi.encode(
                    TYPE_HASH,
                    orderHash,
                    keccak256(abi.encodePacked(permit.participants)),
                    keccak256(abi.encodePacked(permit.shares)),
                    permit.deadline
                )
            );
    }
}
