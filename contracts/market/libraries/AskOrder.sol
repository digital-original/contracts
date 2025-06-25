// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.20;

/**
 * @title AskOrder
 *
 * @notice EIP-712 struct for a sell-side order (ask).
 */
library AskOrder {
    /**
     * @param collection Address of the ERC-721 collection contract.
     * @param currency Address of the settlement currency (ERC-20).
     * @param maker Address of the seller.
     * @param tokenId Token identifier.
     * @param price Sale price.
     * @param makerShare The share of the `price` that will be sent to the `maker`. The remaining
     *                   share will be distributed between the participants from the execution
     *                   permit and the platform.
     * @param startTime Order validity start timestamp.
     * @param endTime Order validity end timestamp.
     */
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

    /// @notice EIP-712 type hash for the {AskOrder.Type} struct.
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

    /**
     * @notice Hashes an ask order using the EIP-712 standard.
     *
     * @param order The ask order to hash.
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
                    order.makerShare,
                    order.startTime,
                    order.endTime
                )
            );
    }
}
