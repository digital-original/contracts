// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.20;

library AskOrder {
    struct Type {
        address collection;
        address currency;
        address maker;
        uint256 tokenId;
        uint256 price;
        uint256 makerShare;
        uint256 startTime;
        uint256 endTime;
    }

    // prettier-ignore
    bytes32 internal constant TYPE_HASH =
        keccak256(
            "AskOrder("
                "address collection,"
                "address currency,"
                "address maker,"
                "uint256 tokenId,"
                "uint256 price,"
                "uint256 makerShare,"
                "uint256 startTime,"
                "uint256 endTime"
            ")"
        );

    function hash(Type calldata order) internal pure returns (bytes32) {
        return
            keccak256(
                abi.encode(
                    TYPE_HASH,
                    order.collection,
                    order.currency,
                    order.maker,
                    order.tokenId,
                    order.price,
                    order.makerShare,
                    order.startTime,
                    order.endTime
                )
            );
    }
}
