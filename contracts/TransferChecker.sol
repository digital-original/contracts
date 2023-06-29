// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import {ITransferChecker} from "./interfaces/ITransferChecker.sol";

/**
 * @title TransferChecker.
 *
 * @notice TransferChecker contract provides logic for checking of a ERC712 token transfer.
 *
 * @dev The contract use immutable variables to reduce gas cost and simplify logic.
 */
contract TransferChecker is ITransferChecker {
    /**
     * @notice Auction contract address.
     */
    address public immutable market;

    /**
     * @notice Market contract address.
     */
    address public immutable auction;

    /**
     * @param _market Market contract address.
     * @param _auction Auction contract address.
     */
    constructor(address _market, address _auction) {
        market = _market;
        auction = _auction;
    }

    /**
     * @inheritdoc ITransferChecker
     */
    function check(address, address to, uint256) external view {
        if (to.code.length == 0) return;
        if (to == market) return;
        if (to == auction) return;

        revert("TransferChecker: not trusted receiver");
    }
}
