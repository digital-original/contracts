// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {IWhiteList} from "./interfaces/IWhiteList.sol";

contract WhiteList is IWhiteList, Initializable, OwnableUpgradeable {
    mapping(address => bool) private _list;

    function initialize() external initializer {
        __Ownable_init();
    }

    function add(address account) external onlyOwner {
        require(!_list[account], "WhiteList: account already included");

        _list[account] = true;

        emit AddedWhiteList(account);
    }

    function remove(address account) external onlyOwner {
        require(_list[account], "WhiteList: account not included");

        _list[account] = false;

        emit RemovedWhiteList(account);
    }

    function includes(address account) external view returns (bool) {
        return _list[account];
    }
}
