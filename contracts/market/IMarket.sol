// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.20;

import {AskOrder} from "./libraries/AskOrder.sol";
import {BidOrder} from "./libraries/BidOrder.sol";
import {OrderExecutionPermit} from "./libraries/OrderExecutionPermit.sol";

interface IMarket {
    event AskOrderExecuted(
        bytes32 orderHash,
        address maker,
        address taker,
        uint256 price,
        uint256 tokenId //
    );

    event BidOrderExecuted(
        bytes32 orderHash,
        address maker,
        address taker,
        uint256 price,
        uint256 tokenId //
    );

    event OrderInvalidated(
        address maker,
        bytes32 orderHash //
    );

    function executeAsk(
        AskOrder.Type calldata order,
        OrderExecutionPermit.Type calldata permit,
        bytes calldata orderSignature,
        bytes calldata permitSignature
    ) external;

    function executeBid(
        BidOrder.Type calldata order,
        OrderExecutionPermit.Type calldata permit,
        bytes calldata orderSignature,
        bytes calldata permitSignature
    ) external;

    function invalidateOrder(address maker, bytes32 orderHash) external;

    function orderInvalidated(address maker, bytes32 orderHash) external returns (bool invalidated);

    function bidFee(uint256 price) external returns (uint256 fee);

    error MarketUnauthorizedOrder();

    error MarketUnauthorizedAccount();

    error MarketOrderOutsideOfTimeRange();

    error MarketRemainingShareTooLow(uint256 remaining);

    error MarketUserBidFeeTooLow();

    error MarketCurrencyInvalid();

    error MarketOrderInvalidated(bytes32 orderHash);

    error MarketMisconfiguration(uint256 argIndex);
}
