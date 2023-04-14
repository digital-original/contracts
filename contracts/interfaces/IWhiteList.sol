// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.16;

/**
 * @title IWhiteList.
 * @notice WhiteList contract interface.
 */
interface IWhiteList {
    /**
     * @dev Triggered when new address was added to whitelist.
     */
    event Added(address indexed account);

    /**
     *  @dev Triggered when an address was removed from whitelist.
     */
    event Removed(address indexed account);

    /**
     * @notice Adds account to whitelist.
     * @param account Account address.
     * @dev Emits 'Added' event.
     */
    function add(address account) external;

    /**
     * @notice Removes account from whitelist.
     * @param account Account address.
     * @dev Emits 'Removed' event.
     */
    function remove(address account) external;

    /**
     * @notice Checks that account is included in whitelist.
     * @param account Account address.
     * @dev Return true if account is included to whitelist.
     */
    function includes(address account) external view returns (bool);
}
