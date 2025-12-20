// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {SafeERC20BulkTransfer} from "../../utils/SafeERC20BulkTransfer.sol";
import {ONE_HUNDRED_PERCENT_IN_BP} from "../../utils/Constants.sol";

/**
 * @title ShareDistributor
 * @notice A library for distributing a total amount of an ERC20 token among multiple participants
 *         based on specified shares.
 */
library ShareDistributor {
    /**
     * @notice Distributes a given amount of an ERC20 token to a list of participants.
     *
     * @dev Calculates rewards and uses {SafeERC20BulkTransfer} to transfer the amounts.
     *
     * @param currency The address of the ERC20 token to distribute.
     * @param amount The total amount of the token to be distributed.
     * @param participants An array of addresses for the recipients.
     * @param shares An array of shares (in basis points) corresponding to each participant.
     */
    function distribute(
        address currency,
        uint256 amount,
        address[] memory participants,
        uint256[] memory shares
    ) internal {
        uint256[] memory rewards = calculateRewards(amount, shares);

        SafeERC20BulkTransfer.safeTransfer(
            IERC20(currency),
            amount,
            participants,
            rewards //
        );
    }

    /**
     * @notice Calculates the individual reward amounts from a total amount based on shares.
     *
     * @dev The last participant receives the remaining amount to prevent loss from rounding errors.
     *
     * @param amount The total amount to be divided.
     * @param shares An array of shares (in basis points).
     *
     * @return rewards An array of calculated reward amounts for each participant.
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
                i++;
            }
        }

        // calculates the last reward out of the loop not to lose wei after division
        rewards[lastIndex] = amount - rewardsSum;
    }

    /**
     * @notice Validates the conditions for a share distribution.
     *
     * @dev Checks for correct array lengths, non-zero addresses, non-zero shares, and that the
     *      total shares sum up to 100%.
     *
     * @param participants An array of addresses for the recipients.
     * @param shares An array of shares (in basis points).
     */
    function requireValidConditions(address[] calldata participants, uint256[] calldata shares) internal pure {
        uint256 participantsCount = participants.length;

        if (participantsCount != shares.length) {
            revert ShareDistributorParticipantsSharesMismatch();
        }

        uint256 sharesSum = 0;

        for (uint256 i = 0; i < participantsCount; ) {
            if (participants[i] == address(0)) {
                revert ShareDistributorZeroAddress();
            }

            uint256 share = shares[i];

            if (share == 0) {
                revert ShareDistributorZeroShare();
            }

            sharesSum += share;

            unchecked {
                i++;
            }
        }

        if (sharesSum != ONE_HUNDRED_PERCENT_IN_BP) {
            revert ShareDistributorSharesSumInvalid(sharesSum);
        }
    }

    /// @dev Thrown when `participants.length != shares.length`.
    error ShareDistributorParticipantsSharesMismatch();

    /// @dev Thrown when a share value is zero.
    error ShareDistributorZeroShare();

    /// @dev Thrown when a participant address is zero.
    error ShareDistributorZeroAddress();

    /// @dev Thrown when `sum(shares) != ONE_HUNDRED_PERCENT_IN_BP`.
    error ShareDistributorSharesSumInvalid(uint256 sharesSum);
}
