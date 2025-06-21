// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.20;

library OrderExecutionPermit {
    struct Type {
        /* bytes32 orderHash; */
        address[] participants;
        uint256[] shares;
        uint256 deadline;
    }

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
