// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.20;

import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {ONE_HUNDRED_PERCENT_IN_BP} from "../../utils/Constants.sol";

/**
 * @title ShareUtils
 * @notice A library for calculating and validating share distributions.
 * @dev This library provides functions to calculate individual reward amounts based on shares
 *      and to validate the conditions for a share distribution.
 */
library ShareUtils {
    /// @notice The maximum number of participants allowed in a share distribution.
    uint256 private constant MAX_PARTICIPANTS = 10;

    /**
     * @notice Calculates the individual reward amounts from a total amount based on shares.
     * @dev The last participant receives the remaining amount to prevent loss from rounding errors.
     * @param amount The total amount to be distributed.
     * @param shares An array of shares (in basis points).
     * @return rewards An array of calculated reward amounts corresponding to each share.
     */
    function calculateRewards(
        uint256 amount,
        uint256[] memory shares
    ) internal pure returns (uint256[] memory rewards) {
        rewards = new uint256[](shares.length);

        uint256 lastIndex = shares.length - 1;
        uint256 rewardsSum = 0;

        for (uint256 i = 0; i < lastIndex; ) {
            uint256 value = Math.mulDiv(amount, shares[i], ONE_HUNDRED_PERCENT_IN_BP);

            rewardsSum += value;

            rewards[i] = value;

            unchecked {
                ++i;
            }
        }

        // calculates the last reward out of the loop not to lose wei after division
        rewards[lastIndex] = amount - rewardsSum;
    }

    /**
     * @notice Validates the conditions for a share distribution.
     * @dev Checks for correct array lengths, non-zero addresses, non-zero shares,
     *      and that the total shares sum up to 100%.
     * @param participants An array of addresses for the recipients.
     * @param shares An array of shares (in basis points).
     */
    function requireValidConditions(
        address[] calldata participants,
        uint256[] calldata shares
    ) internal pure {
        uint256 participantsCount = participants.length;

        if (participantsCount == 0 || participantsCount > MAX_PARTICIPANTS) {
            revert ShareUtilsInvalidParticipantsCount(participantsCount);
        }

        if (participantsCount != shares.length) {
            revert ShareUtilsParticipantsSharesMismatch();
        }

        uint256 sharesSum = 0;

        for (uint256 i = 0; i < participantsCount; ) {
            if (participants[i] == address(0)) {
                revert ShareUtilsZeroAddress();
            }

            uint256 share = shares[i];

            if (share == 0) {
                revert ShareUtilsZeroShare();
            }

            sharesSum += share;

            unchecked {
                ++i;
            }
        }

        if (sharesSum != ONE_HUNDRED_PERCENT_IN_BP) {
            revert ShareUtilsInvalidSum(sharesSum);
        }
    }

    /// @dev Thrown when the number of participants is zero or exceeds the maximum allowed.
    /// @param participantsCount The actual number of participants provided.
    error ShareUtilsInvalidParticipantsCount(uint256 participantsCount);

    /// @dev Thrown when `participants.length != shares.length`.
    error ShareUtilsParticipantsSharesMismatch();

    /// @dev Thrown when a share value is zero.
    error ShareUtilsZeroShare();

    /// @dev Thrown when a participant address is zero.
    error ShareUtilsZeroAddress();

    /// @dev Thrown when `sum(shares) != ONE_HUNDRED_PERCENT_IN_BP`.
    error ShareUtilsInvalidSum(uint256 sharesSum);
}
