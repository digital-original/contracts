// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.20;

import {TokenConfig} from "../../utils/TokenConfig.sol";

/**
 * @title IArtTokenConfigManager
 *
 * @notice Manages configuration for individual tokens, such as creator and regulation mode.
 */
interface IArtTokenConfigManager {
    /**
     * @notice Emitted when a token's configuration is updated.
     * @param tokenId The ID of the token that was updated.
     */
    event TokenConfigUpdated(uint256 tokenId);

    /**
     * @notice Updates the creator of a specific token.
     * @dev Can only be called by an account with the `ADMIN_ROLE`.
     * @param tokenId The ID of the token to update.
     * @param creator The address of the new creator.
     */
    function updateTokenCreator(uint256 tokenId, address creator) external;

    /**
     * @notice Updates the regulation mode of a specific token.
     * @dev Can only be called by an account with the `ADMIN_ROLE`.
     * @param tokenId The ID of the token to update.
     * @param regulationMode The new regulation mode.
     */
    function updateTokenRegulationMode(uint256 tokenId, TokenConfig.RegulationMode regulationMode) external;

    /**
     * @notice Returns the creator of a specific token.
     * @param tokenId The ID of the token to query.
     * @return creator The address of the token's creator.
     */
    function tokenCreator(uint256 tokenId) external view returns (address creator);

    /**
     * @notice Returns the regulation mode of a specific token.
     * @param tokenId The ID of the token to query.
     * @return regulationMode The regulation mode of the token.
     */
    function tokenRegulationMode(uint256 tokenId) external view returns (TokenConfig.RegulationMode regulationMode);

    /**
     * @dev Thrown when an unauthorized account attempts to call a restricted function.
     * @param account The address of the unauthorized account.
     */
    error ArtTokenConfigManagerUnauthorizedAccount(address account);
}
