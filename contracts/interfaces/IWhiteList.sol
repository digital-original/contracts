// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

interface IWhiteList {
    event Added(address indexed account);
    event Removed(address indexed account);

    function add(address account) external;

    function remove(address account) external;

    function includes(address account) external view returns (bool);
}
