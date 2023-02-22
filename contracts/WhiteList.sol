// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract WhiteList is Initializable, OwnableUpgradeable {
    mapping(address => bool) private _list;

    event AddedWhiteList(address account);
    event RemovedWhiteList(address account);

    function initialize() public initializer {
        __Ownable_init();
    }

    function add(address _account) external onlyOwner {
        require(!includes(_account), "WhiteList: account already included");

        _list[_account] = true;
        emit AddedWhiteList(_account);
    }

    function remove(address _account) external onlyOwner {
        require(includes(_account), "WhiteList: account not included");

        _list[_account] = false;
        emit RemovedWhiteList(_account);
    }

    function includes(address _account) public view returns (bool) {
        return _list[_account];
    }
}
