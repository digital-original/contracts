// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.20;

library BidOrder {
    struct Type {
        address maker;
        uint256 tokenId;
        uint256 price;
        uint256 makerFee;
        uint256 startTime;
        uint256 endTime;
    }

    // prettier-ignore
    bytes32 internal constant TYPE_HASH =
        keccak256(
            "BidOrder("
                "address maker,"
                "uint256 tokenId,"
                "uint256 price,"
                "uint256 makerFee,"
                "uint256 startTime,"
                "uint256 endTime"
            ")"
        );

    function hash(Type calldata order) internal pure returns (bytes32) {
        return
            keccak256(
                abi.encode(
                    TYPE_HASH,
                    order.maker,
                    order.tokenId,
                    order.price,
                    order.makerFee,
                    order.startTime,
                    order.endTime
                )
            );
    }
}
