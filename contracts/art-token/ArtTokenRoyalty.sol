// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.20;

import {IERC2981} from "@openzeppelin/contracts/interfaces/IERC2981.sol";
import {ArtTokenConfigManager} from "./art-token-config-manager/ArtTokenConfigManager.sol";
import {ONE_HUNDRED_PERCENT_IN_BP} from "../utils/Constants.sol";

/**
 * @title ArtTokenRoyalty
 *
 * @notice Abstract contract that provides a basic implementation of the EIP-2981 royalty standard.
 *
 * @dev This implementation calculates a fixed 5% royalty on the sale price and designates the
 *      original token creator as the royalty recipient.
 */
abstract contract ArtTokenRoyalty is IERC2981, ArtTokenConfigManager {
    /**
     * @notice The royalty percentage in basis points - 5%.
     */
    uint256 public constant ROYALTY_PERCENT_IN_BP = ONE_HUNDRED_PERCENT_IN_BP / 20; // 5%

    /**
     * @notice Calculates the royalty payment for a token sale, returning the recipient's address and the royalty amount.
     *
     * @param tokenId The ID of the token for which royalty information is being requested.
     * @param salePrice The price at which the token was sold.
     *
     * @return receiver The address that should receive the royalty payment.
     * @return royaltyAmount The amount of the royalty payment.
     */
    function royaltyInfo(
        uint256 tokenId,
        uint256 salePrice
    ) external view returns (address receiver, uint256 royaltyAmount) {
        receiver = _tokenCreator(tokenId);
        royaltyAmount = (salePrice * ROYALTY_PERCENT_IN_BP) / ONE_HUNDRED_PERCENT_IN_BP;
    }
}
