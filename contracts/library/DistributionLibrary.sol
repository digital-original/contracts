// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {Address} from "@openzeppelin/contracts/utils/Address.sol";

library DistributionLibrary {
    error DistributionInvalidSharesCount();
    error DistributionInvalidSharesSum();

    /**
     * @dev Maximum total share.
     */
    uint256 internal constant MAX_TOTAL_SHARE = 10_000;

    /**
     * @dev Distributes reward between participants according to shares.
     *
     * @param reward Ether amount to distribute.
     * @param participants Array with participants address.
     * @param shares Array with shares.
     */
    function distribute(uint256 reward, address[] memory participants, uint256[] memory shares) internal {
        uint256 lastShareIndex = shares.length - 1;
        uint256 released;

        for (uint256 i = 0; i < lastShareIndex; i++) {
            uint256 value = (reward * shares[i]) / MAX_TOTAL_SHARE;

            released += value;

            Address.sendValue(payable(participants[i]), value);
        }

        // calculates last share out of loop not to lose wei after division
        Address.sendValue(payable(participants[lastShareIndex]), reward - released);
    }

    /**
     * @dev Checks that number of participants is equal number of shares,
     *   and sum of shares is equal maximum total share. Throws if data is wrong.
     *
     * @param participants Array with participants address.
     * @param shares Array with shares.
     */
    function validateShares(address[] memory participants, uint256[] memory shares) internal pure {
        if (shares.length != participants.length) revert DistributionInvalidSharesCount();
        if (_sumShares(shares) != MAX_TOTAL_SHARE) revert DistributionInvalidSharesSum();
    }

    /**
     * @param shares Array with shares.
     *
     * @return totalShare Sum of shares.
     */
    function _sumShares(uint256[] memory shares) private pure returns (uint256 totalShare) {
        for (uint256 i = 0; i < shares.length; ) {
            totalShare += shares[i];

            unchecked {
                i++;
            }
        }
    }
}
