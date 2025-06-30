// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.20;

/**
 * @title Order
 *
 * @notice EIP-712 struct for a market order, which can be either a sell-side (ask) or a buy-side
 *         (bid) order.
 */
library Order {
    /**
     * @notice Indicates the side of the order.
     *
     * @param ASK A sell-side order, where the maker is the seller.
     * @param BID A buy-side order, where the maker is the buyer.
     */
    enum Side {
        ASK,
        BID
    }

    /**
     * @notice Represents a market order.
     *
     * @param side The side of the order (ask or bid).
     * @param collection Address of the ERC-721 collection contract.
     * @param currency Address of the settlement currency (ERC-20).
     * @param maker Address of the order's creator.
     * @param tokenId The identifier of the token being traded.
     * @param price The price of the order.
     * @param makerFee The fee that the `maker` is willing to pay for the execution.
     * @param startTime The timestamp from which the order is valid.
     * @param endTime The timestamp until which the order is valid.
     */
    struct Type {
        Side side;
        address collection;
        address currency;
        address maker;
        uint256 tokenId;
        uint256 price;
        uint256 makerFee;
        uint256 startTime;
        uint256 endTime;
    }

    /// @notice EIP-712 type hash for the {Order.Type} struct.
    // prettier-ignore
    bytes32 internal constant TYPE_HASH =
        keccak256(
            "Order("
                  "uint8 side,"
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
     * @notice Hashes an order using the EIP-712 standard.
     *
     * @param order The order to hash.
     *
     * @return orderHash The EIP-712 hash of the order.
     */
    function hash(Type calldata order) internal pure returns (bytes32) {
        return
            keccak256(
                abi.encode(
                    TYPE_HASH,
                    order.side,
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
