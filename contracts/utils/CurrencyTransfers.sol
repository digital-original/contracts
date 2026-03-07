// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ETHER} from "../utils/Constants.sol";
import {IWrappedEther} from "../utils/IWrappedEther.sol";

/**
 * @title CurrencyTransfers
 * @notice This contract provides utility functions for transferring Ether and ERC-20 tokens.
 */
abstract contract CurrencyTransfers {
    /// @notice Gas limit for direct Ether transfers.
    uint256 public constant GAS_LIMIT_ETHER_TRANSFER = 2_300;

    /// @notice The Wrapped Ether contract.
    IWrappedEther public immutable WRAPPED_ETHER;

    /**
     * @notice Initializes the Wrapped Ether address.
     * @param wrappedEther The address of the Wrapped Ether contract.
     */
    constructor(address wrappedEther) {
        if (wrappedEther == address(0)) revert CurrencyTransfersMisconfiguration(0);

        WRAPPED_ETHER = IWrappedEther(wrappedEther);
    }

    /**
     * @notice Sends a specified amount of a currency to a recipient.
     * @dev If the currency is Ether, it attempts a direct transfer and wraps to WETH as a fallback.
     * @param currency The address of the currency.
     * @param to The recipient's address.
     * @param value The amount of currency to send.
     */
    function _sendCurrency(address currency, address to, uint256 value) internal {
        if (value == 0) {
            return;
        }

        if (currency == ETHER) {
            _sendEtherAndWrapIfFail(to, value);
        } else {
            SafeERC20.safeTransfer(IERC20(currency), to, value);
        }
    }

    /**
     * @notice Receives a specified amount of a currency from a sender.
     * @dev Validates the `msg.value` for Ether transactions and ensures no Ether is sent for token transactions.
     * @param currency The address of the currency.
     * @param from The sender's address.
     * @param value The amount of currency to receive.
     */
    function _receiveCurrency(address currency, address from, uint256 value) internal {
        if (currency == ETHER) {
            // Ensure the correct amount of Ether is sent with the transaction
            if (msg.value != value) {
                revert CurrencyTransfersIncorrectEtherValue();
            }
        } else {
            // Ensure no Ether is sent with the transaction
            if (msg.value != 0) {
                revert CurrencyTransfersUnexpectedEther();
            }

            if (value == 0) {
                return;
            }

            SafeERC20.safeTransferFrom(IERC20(currency), from, address(this), value);
        }
    }

    /**
     * @notice Sends a currency to multiple recipients in a batch.
     * @dev Reverts if input arrays have different lengths or if any transfer details are invalid.
     * @param currency The address of the currency to send.
     * @param amount The total amount to be distributed.
     * @param receivers An array of recipient addresses.
     * @param values An array of amounts to send to each recipient.
     */
    function _sendCurrencyBatch(
        address currency,
        uint256 amount,
        address[] memory receivers,
        uint256[] memory values
    ) internal {
        uint256 receiversCount = receivers.length;

        if (receiversCount != values.length) {
            revert CurrencyTransfersInvalidInputLengths();
        }

        uint256 sent = 0;

        for (uint256 i; i < receiversCount; ) {
            address receiver = receivers[i];
            uint256 value = values[i];

            if (receiver == address(0)) {
                revert CurrencyTransfersZeroAddress();
            }

            if (value == 0) {
                revert CurrencyTransfersZeroValue();
            }

            _sendCurrency(currency, receiver, value);

            sent += value;

            unchecked {
                ++i;
            }
        }

        if (amount != sent) {
            revert CurrencyTransfersIncorrectTotalAmount();
        }
    }

    /**
     * @notice Attempts to send Ether and wraps it into WETH if the direct transfer fails.
     * @param to The recipient's address.
     * @param value The amount of Ether to send.
     */
    function _sendEtherAndWrapIfFail(address to, uint256 value) private {
        bool status;

        assembly {
            status := call(GAS_LIMIT_ETHER_TRANSFER, to, value, 0, 0, 0, 0)
        }

        if (!status) {
            WRAPPED_ETHER.deposit{value: value}();
            SafeERC20.safeTransfer(WRAPPED_ETHER, to, value);
        }
    }

    /// @dev Thrown when the lengths of the `receivers` and `values` arrays do not match.
    error CurrencyTransfersInvalidInputLengths();

    /// @dev Thrown when a receiver's address is the zero address.
    error CurrencyTransfersZeroAddress();

    /// @dev Thrown when a transfer value is zero.
    error CurrencyTransfersZeroValue();

    /// @dev Thrown when the sum of `values` does not equal the total `amount`.
    error CurrencyTransfersIncorrectTotalAmount();

    /// @dev Thrown when the Ether value sent does not match the expected value.
    error CurrencyTransfersIncorrectEtherValue();

    /// @dev Thrown when an unexpected amount of Ether is sent.
    error CurrencyTransfersUnexpectedEther();

    /// @dev Thrown when a constructor argument at index `argIndex` is invalid.
    error CurrencyTransfersMisconfiguration(uint8 argIndex);
}
