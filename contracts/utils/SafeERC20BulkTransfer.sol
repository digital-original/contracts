// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title SafeERC20BulkTransfer
 *
 * @notice A library for performing safe bulk transfers of ERC20 tokens.
 *
 * @dev This library provides a `safeTransfer` function that iterates over arrays of receivers and
 *      values to transfer tokens to multiple recipients. It includes validation to ensure the
 *      input arrays are consistent and that the total transferred amount matches the expected
 *      amount.
 */
library SafeERC20BulkTransfer {
    /**
     * @notice Safely transfers ERC20 tokens to multiple receivers.
     *
     * @dev Reverts if the lengths of the `receivers` and `values` arrays do not match, if a
     *      receiver is the zero address, if a value is zero, or if the sum of `values` does not
     *      equal `amount`.
     *
     * @param currency The ERC20 token to transfer.
     * @param amount The total amount of tokens to be transferred.
     * @param receivers An array of addresses to receive the tokens.
     * @param values An array of amounts to be transferred to each receiver.
     */
    function safeTransfer(
        IERC20 currency,
        uint256 amount,
        address[] memory receivers,
        uint256[] memory values
    ) internal {
        uint256 receiversCount = receivers.length;

        if (receiversCount != values.length) {
            revert SafeERC20BulkTransferInvalidInputLengths();
        }

        uint256 transferred = 0;

        for (uint256 i; i < receiversCount; ) {
            address receiver = receivers[i];
            uint256 value = values[i];

            if (receiver == address(0)) {
                revert SafeERC20BulkTransferZeroAddress();
            }

            if (value == 0) {
                revert SafeERC20BulkTransferZeroValue();
            }

            SafeERC20.safeTransfer(currency, receiver, value);

            transferred += value;

            unchecked {
                i++;
            }
        }

        if (amount != transferred) {
            revert SafeERC20BulkTransferIncorrectTotalAmount();
        }
    }

    /// @dev Thrown when the lengths of the `receivers` and `values` arrays do not match.
    error SafeERC20BulkTransferInvalidInputLengths();
    /// @dev Thrown when a receiver's address is the zero address.
    error SafeERC20BulkTransferZeroAddress();
    /// @dev Thrown when a transfer value is zero.
    error SafeERC20BulkTransferZeroValue();
    /// @dev Thrown when the sum of `values` does not equal the total `amount`.
    error SafeERC20BulkTransferIncorrectTotalAmount();
}
