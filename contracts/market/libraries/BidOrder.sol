// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.20;

/**
 * @title BidOrder
 *
 * @notice EIP-712 struct for a buy-side order (bid).
 */
library BidOrder {
    /**
     * @param collection Address of the ERC-721 collection contract.
     * @param currency Address of the settlement currency (ERC-20).
     * @param maker Address of the buyer.
     * @param tokenId Token identifier.
     * @param price Purchase price.
     * @param makerFee The fee that `maker` is willing to pay for the execution.
     * @param startTime Order validity start timestamp.
     * @param endTime Order validity end timestamp.
     */
    struct Type {
        address collection;
        address currency;
        address maker;
        uint256 tokenId;
        uint256 price;
        uint256 makerFee;
        uint256 startTime;
        uint256 endTime;
    }

    /// @notice EIP-712 type hash for the {BidOrder.Type} struct.
    // prettier-ignore
    bytes32 internal constant TYPE_HASH =
        keccak256(
            "BidOrder("
                "address collection,"
                "address currency,"
                "address maker,"
                "uint256 tokenId,"
                "uint256 price,"
                "uint256 makerFee,"
                "uint256 startTime,"
                "uint256 endTime"
            ")"
        );

    /**
     * @notice Hashes a bid order using the EIP-712 standard.
     *
     * @param order The bid order to hash.
     *
     * @return orderHash The EIP-712 hash of the order.
     */
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
                    order.makerFee,
                    order.startTime,
                    order.endTime
                )
            );
    }
}
