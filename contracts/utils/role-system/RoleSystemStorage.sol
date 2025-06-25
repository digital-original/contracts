// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.20;

/**
 * @title RoleSystemStorage
 *
 * @notice Defines the storage layout for {RoleSystem}. Using a deterministic slot
 * makes the module safe for use behind proxies and alongside other upgradeable components.
 */
library RoleSystemStorage {
    /// @dev Unique storage slot for the layout, computed using EIP-7201 convention.
    bytes32 private constant STORAGE_SLOT =
        keccak256(abi.encode(uint256(keccak256("digital-original.storage.RoleSystem")) - 1)) & ~bytes32(uint256(0xff));

    /**
     * @custom:storage-location erc7201:digital-original.storage.RoleSystem
     */
    struct Layout {
        mapping(bytes32 role => mapping(address => bool)) hasRole;
        mapping(bytes32 role => address) uniqueRoleOwner;
    }

    /**
     * @notice Returns a pointer to the storage layout.
     *
     * @return $ The pointer to the Layout struct in storage.
     */
    function layout() internal pure returns (Layout storage $) {
        bytes32 slot = STORAGE_SLOT;

        // solhint-disable-next-line
        assembly {
            $.slot := slot
        }
    }
}
