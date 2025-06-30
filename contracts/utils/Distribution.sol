// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";

/**
 * @title Distribution
 *
 * @notice Library for deterministic ERC-20 amount splitting.
 *
 * @dev Provides helpers to safely distribute `amount` among `participants` given a
 *      {TOTAL_SHARE}-denominated `shares` array (10,000 — i.e. basis points).
 */
library Distribution {
    using SafeERC20 for IERC20;

    /**
     * @dev Denominator used for share calculations (basis points).
     */
    uint256 internal constant TOTAL_SHARE = 10_000;

    /**
     * @notice Performs a validation pass and then distributes `amount` between `participants`
     *         according to `shares`.
     *
     * @dev Reverts with one of the custom errors declared at the bottom of the contract if
     *      validation fails. Uses {SafeERC20.safeTransfer} to guard against non-standard ERC-20s.
     *
     * @param currency ERC20 currency address.
     * @param amount Amount to distribute.
     * @param participants Addresses that will receive a portion of `amount`.
     * @param shares Shares (in basis points) assigned to each participant.
     */
    function safeDistribute(
        IERC20 currency,
        uint256 amount,
        address[] memory participants,
        uint256[] memory shares
    ) internal {
        requireValidConditions(participants, shares);
        distribute(currency, amount, participants, shares);
    }

    /**
     * @notice Distributes `amount` between `participants` according to `shares`.
     *
     * @dev Performs **no** parameter validation — callers MUST ensure that {requireValidConditions}
     *      has been invoked prior to calling this function.
     *
     * @param currency ERC20 currency address.
     * @param amount Amount to distribute.
     * @param participants An array of participant addresses.
     * @param shares An array of shares (in basis points) corresponding to each participant.
     */
    function distribute(
        IERC20 currency,
        uint256 amount,
        address[] memory participants,
        uint256[] memory shares
    ) internal {
        uint256 lastIndex = participants.length - 1;
        uint256 distributed = 0;

        for (uint256 i = 0; i < lastIndex; ) {
            uint256 value = Math.mulDiv(amount, shares[i], TOTAL_SHARE);

            distributed += value;

            currency.safeTransfer(participants[i], value);

            unchecked {
                i++;
            }
        }

        // calculates last share out of loop not to lose wei after division
        currency.safeTransfer(participants[lastIndex], amount - distributed);
    }

    /**
     * @notice Validates distribution parameters.
     *
     * @dev Reverts with a custom error if:
     *      - `participants` and `shares` lengths mismatch;
     *      - Any participant is the zero address;
     *      - Any share is zero;
     *      - The sum of `shares` does not equal {TOTAL_SHARE}.
     *
     * @param participants An array of participant addresses.
     * @param shares An array of shares (in basis points) corresponding to each participant.
     */
    function requireValidConditions(address[] memory participants, uint256[] memory shares) internal pure {
        uint256 participantsCount = participants.length;

        if (participantsCount != shares.length) {
            revert DistributionParticipantsSharesMismatch();
        }

        uint256 sharesSum = 0;

        for (uint256 i = 0; i < participantsCount; ) {
            if (participants[i] == address(0)) {
                revert DistributionZeroAddress();
            }

            uint256 share = shares[i];

            if (share == 0) {
                revert DistributionZeroShare();
            }

            sharesSum += share;

            unchecked {
                i++;
            }
        }

        if (sharesSum != TOTAL_SHARE) {
            revert DistributionSharesSumInvalid(sharesSum);
        }
    }

    /// @dev Thrown when `participants.length != shares.length`.
    error DistributionParticipantsSharesMismatch();

    /// @dev Thrown when a share value is zero.
    error DistributionZeroShare();

    /// @dev Thrown when a participant address is zero.
    error DistributionZeroAddress();

    /// @dev Thrown when `sum(shares) != TOTAL_SHARE`.
    error DistributionSharesSumInvalid(uint256 sharesSum);
}
