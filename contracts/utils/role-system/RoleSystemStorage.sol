// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.20;

/**
 * @title RoleSystemStorage
 *
 * @notice The library provides access to RoleSystem storage layout.
 */
library RoleSystemStorage {
    bytes32 private constant STORAGE_SLOT =
        keccak256(abi.encode(uint256(keccak256("digital-original.storage.RoleSystem")) - 1)) & ~bytes32(uint256(0xff));

    /**
     * @custom:storage-location erc7201:digital-original.storage.RoleSystem
     */
    struct Layout {
        mapping(bytes32 role => mapping(address account => bool)) _roles;
        mapping(bytes32 role => address account) _uniqueRoles;
    }

    /**
     * @dev Returns storage layout
     */
    function layout() internal pure returns (Layout storage $) {
        bytes32 slot = STORAGE_SLOT;

        // solhint-disable-next-line
        assembly {
            $.slot := slot
        }
    }
}
