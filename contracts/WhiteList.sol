// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {ERC165Upgradeable} from "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165Upgradeable.sol";
import {IWhiteList} from "./interfaces/IWhiteList.sol";

/**
 * @title WhiteList
 * @notice WhiteList contract stores whitelisted accounts.
 * @notice Upgradeable Contract based on [OpenZeppelin](https://docs.openzeppelin.com/) library.
 */
contract WhiteList is IWhiteList, Initializable, OwnableUpgradeable, ERC165Upgradeable {
    /**
     * @dev Stores whitelisted accounts.
     */
    mapping(address => bool) private _list;

    /**
     * @notice Initializes contract.
     * @dev Method should be invoked on proxy contract via `delegatecall`.
     *   See <https://docs.openzeppelin.com/upgrades-plugins/1.x/writing-upgradeable#initializers>.
     */
    function initialize() external initializer {
        // TODO: maybe it makes sense to write owner to immutable variable to save gas
        __Ownable_init();
    }

    /**
     * @inheritdoc IWhiteList
     * @dev Only owner can invoke method.
     */
    function add(address account) external onlyOwner {
        require(!_list[account], "WhiteList: account already included");

        _list[account] = true;

        emit Added(account);
    }

    /**
     * @inheritdoc IWhiteList
     * @dev Only owner can invoke method.
     */
    function remove(address account) external onlyOwner {
        require(_list[account], "WhiteList: account not included");

        _list[account] = false;

        emit Removed(account);
    }

    /**
     * @inheritdoc IWhiteList
     */
    function includes(address account) external view returns (bool) {
        return _list[account];
    }

    /**
     * @dev See <https://eips.ethereum.org/EIPS/eip-165>
     */
    function supportsInterface(bytes4 interfaceId) public view override returns (bool) {
        return interfaceId == type(IWhiteList).interfaceId || super.supportsInterface(interfaceId);
    }

    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     *   variables without shifting down storage in the inheritance chain.
     *   See <https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps>.
     */
    uint256[49] private __gap;
}
