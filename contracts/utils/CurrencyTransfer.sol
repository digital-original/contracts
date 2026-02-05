// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ETHER} from "../utils/Constants.sol";
import {IWrappedEther} from "../utils/IWrappedEther.sol";

contract CurrencyTransfer {
    uint256 public constant GAS_LIMIT_ETHER_TRANSFER = 2_300;

    IWrappedEther public immutable WRAPPED_ETHER;

    constructor(address wrappedEther) {
        // if (wrappedEther == address(0)) revert CurrencyTransferMisconfiguration(0);
        WRAPPED_ETHER = IWrappedEther(wrappedEther);
    }

    function _sendCurrency(address currency, address to, uint256 value) internal {
        if (currency == ETHER) {
            _sendEtherAndWrapIfFail(to, value);
        } else {
            SafeERC20.safeTransfer(IERC20(currency), to, value);
        }
    }

    function _receiveCurrency(address currency, address from, uint256 value) internal {
        if (currency == ETHER) {
            // Ensure the correct amount of Ether is sent with the transaction
            if (msg.value != value) {
                revert CurrencyTransferIncorrectEtherValue();
            }
        } else {
            // Ensure no Ether is sent with the transaction
            if (msg.value != 0) {
                revert CurrencyTransferUnexpectedEther();
            }

            SafeERC20.safeTransferFrom(IERC20(currency), from, address(this), value);
        }
    }

    function _sendCurrencyBatch(
        address currency,
        uint256 amount,
        address[] memory receivers,
        uint256[] memory values
    ) internal {
        uint256 receiversCount = receivers.length;

        if (receiversCount != values.length) {
            revert CurrencyTransferInvalidInputLengths();
        }

        uint256 sent = 0;

        for (uint256 i; i < receiversCount; ) {
            address receiver = receivers[i];
            uint256 value = values[i];

            if (receiver == address(0)) {
                revert CurrencyTransferZeroAddress();
            }

            if (value == 0) {
                revert CurrencyTransferZeroValue();
            }

            _sendCurrency(currency, receiver, value);

            sent += value;

            unchecked {
                i++;
            }
        }

        if (amount != sent) {
            revert CurrencyTransferIncorrectTotalAmount();
        }
    }

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
    error CurrencyTransferInvalidInputLengths();
    /// @dev Thrown when a receiver's address is the zero address.
    error CurrencyTransferZeroAddress();
    /// @dev Thrown when a transfer value is zero.
    error CurrencyTransferZeroValue();
    /// @dev Thrown when the sum of `values` does not equal the total `amount`.
    error CurrencyTransferIncorrectTotalAmount();
    /// @dev Thrown when the Ether value sent does not match the expected value.
    error CurrencyTransferIncorrectEtherValue();
    /// @dev Thrown when an unexpected amount of Ether is sent.
    error CurrencyTransferUnexpectedEther();
}
