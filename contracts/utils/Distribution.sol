// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";

/**
 * @title Distribution
 *
 * @notice Library for deterministic ERC-20 reward splitting.
 *
 * @dev Provides helpers to safely distribute `reward` among `participants`
 *      given a {TOTAL_SHARE}-denominated `shares` array (10,000 —
 *      i.e. basis points).
 */
library Distribution {
    using SafeERC20 for IERC20;

    /**
     * @dev Denominator used for share calculations (basis points).
     */
    uint256 internal constant TOTAL_SHARE = 10_000;

    /**
     * @notice Performs a validation pass and then distributes `reward` between
     *         `participants` according to `shares`.
     *
     * @dev Reverts with one of the custom errors declared at the bottom of the
     *      contract if validation fails. Uses {SafeERC20.safeTransfer} to guard
     *      against non-standard ERC-20s.
     *
     * @param currency ERC20 currency address.
     * @param reward Amount to distribute.
     * @param participants Addresses that will receive a portion of `reward`.
     * @param shares       Shares (in basis points) assigned to each participant.
     */
    function safeDistribute(
        IERC20 currency,
        uint256 reward,
        address[] memory participants,
        uint256[] memory shares
    ) internal {
        requireValidConditions(participants, shares);
        distribute(currency, reward, participants, shares);
    }

    /**
     * @notice Distributes `reward` between `participants` according to `shares`.
     *
     * @dev Performs **no** parameter validation — callers MUST ensure that
     *      {requireValidConditions} has been invoked prior to calling this
     *      function.
     *
     * @param currency ERC20 currency address.
     * @param reward Amount to distribute.
     * @param participants Addresses that will receive a portion of `reward`.
     * @param shares       Shares (in basis points) assigned to each participant.
     */
    function distribute(
        IERC20 currency,
        uint256 reward,
        address[] memory participants,
        uint256[] memory shares
    ) internal {
        uint256 lastShareIndex = shares.length - 1;
        uint256 distributed = 0;

        for (uint256 i = 0; i < lastShareIndex; ) {
            uint256 value = Math.mulDiv(reward, shares[i], TOTAL_SHARE);

            distributed += value;

            currency.safeTransfer(participants[i], value);

            unchecked {
                i++;
            }
        }

        // calculates last share out of loop not to lose wei after division
        currency.safeTransfer(participants[lastShareIndex], reward - distributed);
    }

    /**
     * @notice Validates distribution parameters.
     *
     * @dev Reverts with a custom error if:
     *      - `participants` and `shares` lengths mismatch;
     *      - Any participant is the zero address;
     *      - Any share is zero (via {_sumShares});
     *      - Sum of shares exceeds {TOTAL_SHARE} or is below it.
     *
     * @param participants Array with participants address.
     * @param shares       Shares (in basis points) corresponding to each participant.
     */
    function requireValidConditions(address[] memory participants, uint256[] memory shares) internal pure {
        uint256 participantsLen = participants.length;

        if (participantsLen != shares.length) {
            revert DistributionParticipantsSharesMismatch();
        }

        for (uint256 i = 0; i < participantsLen; ) {
            if (participants[i] == address(0)) {
                revert DistributionZeroAddress();
            }

            unchecked {
                i++;
            }
        }

        uint256 sharesSum = _sumShares(shares);

        if (sharesSum < TOTAL_SHARE) {
            revert DistributionSharesSumTooLow(sharesSum);
        }
    }

    /**
     * @notice Calculates the unallocated share given an array of `shares`.
     *
     * @dev Useful for determining the last participant's share when the
     *      other shares are known but do not yet sum to {TOTAL_SHARE}.
     *
     * @param shares Array containing shares expressed in basis points.
     *
     * @return remaining The difference between {TOTAL_SHARE} and the sum
     *                  of provided `shares`.
     */
    function remainingShare(uint256[] calldata shares) internal pure returns (uint256 remaining) {
        return TOTAL_SHARE - _sumShares(shares);
    }

    /**
     * @dev Internal helper that sums the `shares` array while enforcing
     *              invariants.
     *
     * Requirements:
     *  - Every share must be non-zero ({DistributionZeroShare});
     *  - Running total must not exceed {TOTAL_SHARE} ({DistributionSharesSumTooBig}).
     *
     * @param shares Array of shares in basis points.
     *
     * @return sharesSum Cumulative sum of the shares.
     */
    function _sumShares(uint256[] memory shares) private pure returns (uint256 sharesSum) {
        uint256 sharesLen = shares.length;

        for (uint256 i = 0; i < sharesLen; ) {
            uint256 share = shares[i];

            if (share == 0) {
                revert DistributionZeroShare();
            }

            sharesSum += share;

            unchecked {
                i++;
            }
        }

        if (sharesSum > TOTAL_SHARE) {
            revert DistributionSharesSumTooBig(sharesSum);
        }
    }

    /**
     * @dev Thrown when `participants.length != shares.length`.
     */
    error DistributionParticipantsSharesMismatch();

    /// @dev Thrown when a share value of zero is encountered.
    error DistributionZeroShare();

    /// @dev Thrown when a participant address is the zero address.
    error DistributionZeroAddress();

    /// @dev Thrown when `sum(shares) < TOTAL_SHARE`.
    error DistributionSharesSumTooLow(uint256 shareSum);

    /// @dev Thrown when `sum(shares) > TOTAL_SHARE`.
    error DistributionSharesSumTooBig(uint256 shareSum);
}
