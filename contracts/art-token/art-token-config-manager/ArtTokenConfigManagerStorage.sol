// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.20;

import {TokenConfig} from "../../utils/TokenConfig.sol";

/**
 * @title ArtTokenConfigManagerStorage
 * @notice Defines the storage layout for {ArtTokenConfigManager}. Using a deterministic slot makes the
 *         module safe for use behind proxies and alongside other upgradeable components.
 */
library ArtTokenConfigManagerStorage {
    /// @notice Unique storage slot for the layout, computed using EIP-7201 convention.
    bytes32 private constant STORAGE_SLOT =
        keccak256(abi.encode(uint256(keccak256("digital-original.storage.ArtTokenConfigManager")) - 1)) &
            ~bytes32(uint256(0xff));

    /**
     * @custom:storage-location erc7201:digital-original.storage.ArtTokenConfigManager
     */
    struct Layout {
        mapping(uint256 tokenId => TokenConfig.Type) tokenConfig;
    }

    /**
     * @notice Returns a pointer to the storage layout.
     * @return $ The pointer to the Layout struct in storage.
     */
    function layout() internal pure returns (Layout storage $) {
        bytes32 slot = STORAGE_SLOT;

        assembly {
            $.slot := slot
        }
    }
}
