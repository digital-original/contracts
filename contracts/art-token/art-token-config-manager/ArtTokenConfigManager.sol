// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.20;

import {RoleSystem} from "../../utils/role-system/RoleSystem.sol";
import {Roles} from "../../utils/Roles.sol";
import {TokenConfig} from "../../utils/TokenConfig.sol";
import {ArtTokenConfigManagerStorage} from "./ArtTokenConfigManagerStorage.sol";
import {IArtTokenConfigManager} from "./IArtTokenConfigManager.sol";

/**
 * @title ArtTokenConfigManager
 * @notice Abstract contract that implements the logic for managing token configurations.
 * @dev This contract is intended to be inherited by other contracts to provide token
 *      configuration management functionality. It uses `ArtTokenConfigManagerStorage`
 *      to store token configurations.
 */
abstract contract ArtTokenConfigManager is IArtTokenConfigManager, RoleSystem {
    /**
     * @inheritdoc IArtTokenConfigManager
     */
    function updateTokenCreator(uint256 tokenId, address creator) external onlyRole(Roles.ADMIN_ROLE) {
        ArtTokenConfigManagerStorage.Layout storage $ = ArtTokenConfigManagerStorage.layout();

        $.tokenConfig[tokenId].creator = creator;

        emit TokenConfigUpdated(tokenId);
    }

    /**
     * @inheritdoc IArtTokenConfigManager
     */
    function updateTokenRegulationMode(
        uint256 tokenId,
        TokenConfig.RegulationMode regulationMode
    ) external onlyRole(Roles.ADMIN_ROLE) {
        ArtTokenConfigManagerStorage.Layout storage $ = ArtTokenConfigManagerStorage.layout();

        $.tokenConfig[tokenId].regulationMode = regulationMode;

        emit TokenConfigUpdated(tokenId);
    }

    /**
     * @inheritdoc IArtTokenConfigManager
     */
    function tokenCreator(uint256 tokenId) external view returns (address creator) {
        ArtTokenConfigManagerStorage.Layout storage $ = ArtTokenConfigManagerStorage.layout();

        return $.tokenConfig[tokenId].creator;
    }

    /**
     * @inheritdoc IArtTokenConfigManager
     */
    function tokenRegulationMode(uint256 tokenId) external view returns (TokenConfig.RegulationMode regulationMode) {
        ArtTokenConfigManagerStorage.Layout storage $ = ArtTokenConfigManagerStorage.layout();

        return $.tokenConfig[tokenId].regulationMode;
    }

    /**
     * @notice Internal function to set the entire configuration for a token.
     * @dev Emits a {TokenConfigUpdated} event.
     * @param tokenId The ID of the token to configure.
     * @param tokenConfig The configuration to set for the token.
     */
    function _setTokenConfig(uint256 tokenId, TokenConfig.Type calldata tokenConfig) internal {
        ArtTokenConfigManagerStorage.Layout storage $ = ArtTokenConfigManagerStorage.layout();

        $.tokenConfig[tokenId] = tokenConfig;

        emit TokenConfigUpdated(tokenId);
    }

    /**
     * @notice Internal function to get the creator of a token.
     * @dev If the creator is not set (i.e., it's the zero address), it returns the owner
     *      of the `FINANCIAL_ROLE` as a fallback.
     * @param tokenId The ID of the token to query.
     * @return creator The address of the token's creator.
     */
    function _tokenCreator(uint256 tokenId) internal view returns (address creator) {
        ArtTokenConfigManagerStorage.Layout storage $ = ArtTokenConfigManagerStorage.layout();

        creator = $.tokenConfig[tokenId].creator;

        if (creator == address(0)) {
            return _uniqueRoleOwner(Roles.FINANCIAL_ROLE);
        }
    }

    /**
     * @notice Internal function to get the regulation mode of a token.
     * @dev If the regulation mode is `None`, it returns `Regulated` as a fallback.
     * @param tokenId The ID of the token to query.
     * @return regulationMode The regulation mode of the token.
     */
    function _tokenRegulationMode(uint256 tokenId) internal view returns (TokenConfig.RegulationMode regulationMode) {
        ArtTokenConfigManagerStorage.Layout storage $ = ArtTokenConfigManagerStorage.layout();

        regulationMode = $.tokenConfig[tokenId].regulationMode;

        if (regulationMode == TokenConfig.RegulationMode.None) {
            return TokenConfig.RegulationMode.Regulated;
        }
    }
}
