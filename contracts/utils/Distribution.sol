// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {IERC20 as ERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

library Distribution {
    using SafeERC20 for ERC20;

    error DistributionInvalidSharesCount();
    error DistributionInvalidSharesSum();

    /**
     * @dev Maximum total share.
     */
    uint256 internal constant TOTAL_SHARE = 10_000;

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
     * @dev Distributes reward between participants according to shares.
     *
     * @param amount Ether amount to distribute.
     * @param participants Array with participants address.
     * @param shares Array with shares.
     */
    function distribute(ERC20 asset, uint256 amount, address[] memory participants, uint256[] memory shares) internal {
        uint256 lastShareIndex = shares.length - 1;
        uint256 distributed;

        for (uint256 i = 0; i < lastShareIndex; ) {
            uint256 value = (amount * shares[i]) / TOTAL_SHARE;

            distributed += value;

            asset.safeTransfer(participants[i], value);

            unchecked {
                i++;
            }
        }

        // calculates last share out of loop not to lose wei after division
        asset.safeTransfer(participants[lastShareIndex], amount - distributed);
    }

    /**
     * @dev Checks that number of participants is equal number of shares,
     *   and sum of shares is equal maximum total share. Throws if data is wrong.
     *
     * @param participants Array with participants address.
     * @param shares Array with shares.
     */
    function requireValidConditions(address[] memory participants, uint256[] memory shares) internal pure {
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
}
