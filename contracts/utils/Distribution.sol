// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.20;

import {IERC20 as ERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title Distribution
 *
 * @notice Distribution library provides functionality to distribute reward
 * and validate distribution conditions.
 */
library Distribution {
    using SafeERC20 for ERC20;

    /**
     * @dev Maximum total share.
     */
    uint256 internal constant TOTAL_SHARE = 10_000;

    /**
     * @notice Distributes reward between participants according to shares.
     *
     * @dev Validates conditions before distribution.
     *
     * @param asset ERC20 asset address.
     * @param reward Amount to distribute.
     * @param participants Array with participants address.
     * @param shares Array with shares.
     */
    function safeDistribute(
        ERC20 asset,
        uint256 reward,
        address[] memory participants,
        uint256[] memory shares
    ) internal {
        requireValidConditions(participants, shares);
        distribute(asset, reward, participants, shares);
    }

    /**
     * @notice Distributes reward between participants according to shares.
     *
     * @param asset ERC20 asset address.
     * @param reward Amount to distribute.
     * @param participants Array with participants address.
     * @param shares Array with shares.
     */
    function distribute(ERC20 asset, uint256 reward, address[] memory participants, uint256[] memory shares) internal {
        uint256 lastShareIndex = shares.length - 1;
        uint256 distributed;

        for (uint256 i = 0; i < lastShareIndex; ) {
            uint256 value = (reward * shares[i]) / TOTAL_SHARE;

            distributed += value;

            asset.safeTransfer(participants[i], value);

            unchecked {
                i++;
            }
        }

        // calculates last share out of loop not to lose wei after division
        asset.safeTransfer(participants[lastShareIndex], reward - distributed);
    }

    /**
     * @notice Checks that shares count is equal participants count,
     *   and sum of shares is equal maximum share. Throws if data is invalid.
     *
     * @param participants Array with participants address.
     * @param shares Array with shares.
     */
    function requireValidConditions(address[] memory participants, uint256[] memory shares) internal pure {
        for (uint256 i = 0; i < participants.length; ) {
            if (participants[i] == address(0)) {
                revert DistributionZeroAddress();
            }

            unchecked {
                i++;
            }
        }

        if (shares.length != participants.length) {
            revert DistributionInvalidSharesCount();
        }

        uint256 sharesSum;

        for (uint256 i = 0; i < shares.length; ) {
            sharesSum += shares[i];

            unchecked {
                i++;
            }
        }

        if (sharesSum != TOTAL_SHARE) {
            revert DistributionInvalidSharesSum();
        }
    }

    /**
     * @dev Shares count is not equal participants count.
     */
    error DistributionInvalidSharesCount();

    /**
     * @dev Shares sum is not equal maximum share.
     */
    error DistributionInvalidSharesSum();

    /**
     * @dev Zero address among participants.
     */
    error DistributionZeroAddress();
}
