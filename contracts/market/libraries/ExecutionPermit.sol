// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.20;

/**
 * @title ExecutionPermit
 *
 * @notice EIP-712 struct for an order execution permit, which authorizes the execution of a
 *         market order and specifies the taker fee and revenue-sharing details.
 */
library ExecutionPermit {
    /**
     * @notice Represents an order execution permit.
     *
     * @param orderHash The hash of the order to be executed.
     * @param taker The address of the account that is executing the order.
     * @param takerFee The fee that the `taker` is willing to pay for the execution.
     * @param participants The addresses of the participants in the revenue share.
     * @param rewards The corresponding rewards for each participant.
     * @param deadline The timestamp until which the permit is valid.
     */
    struct Type {
        bytes32 orderHash;
        address taker;
        uint256 takerFee;
        address[] participants;
        uint256[] rewards;
        uint256 deadline;
    }

    /// @notice EIP-712 type hash for the {ExecutionPermit.Type} struct.
    // prettier-ignore
    bytes32 internal constant TYPE_HASH =
        keccak256(
            "ExecutionPermit("
                  "bytes32 orderHash,"
                  "address taker,"
                  "uint256 takerFee,"
                "address[] participants,"
                "uint256[] rewards,"
                  "uint256 deadline"
            ")"
        );

    /**
     * @notice Hashes an execution permit using the EIP-712 standard.
     *
     * @param permit The execution permit to hash.
     *
     * @return permitHash The EIP-712 hash of the permit.
     */
    function hash(Type calldata permit) internal pure returns (bytes32) {
        return
            keccak256(
                abi.encode(
                    TYPE_HASH,
                    permit.orderHash,
                    permit.taker,
                    permit.takerFee,
                    keccak256(abi.encodePacked(permit.participants)),
                    keccak256(abi.encodePacked(permit.rewards)),
                    permit.deadline
                )
            );
    }
}
