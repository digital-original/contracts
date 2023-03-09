// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import {Market} from "../../contracts/Market.sol";
import {CollectionMock} from "../../contracts/test/CollectionMock.sol";

contract MarketFuzz is Market {
    address ORDER_SIGNER = 0x0000000000000000000000000000000000000001;

    constructor() {
        Market market = new Market();

        CollectionMock collectionMock = new CollectionMock("baseURI");

        address(market).delegatecall(
            abi.encodeWithSignature("initialize(address,address)", address(collectionMock), ORDER_SIGNER)
        );
    }

    function echidna_check_order_count() public returns (bool) {
        return orderCount == 0;
    }

    function echidna_check_order_signer() public returns (bool) {
        return this.marketSigner() == address(0);
    }
}
