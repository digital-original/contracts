// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {RoleSystem} from "../role-system/RoleSystem.sol";
import {Roles} from "../Roles.sol";
import {AssetListStorage} from "./AssetListStorage.sol";
import {IAssetList} from "./IAssetList.sol";

abstract contract AssetList is IAssetList, RoleSystem {
    function listAsset(address asset) external onlyRole(Roles.ADMIN_ROLE) {
        AssetListStorage.Layout storage $ = AssetListStorage.layout();

        $.listed[asset] = true;

        emit AssetListed(asset);
    }

    function delistAsset(address asset) external onlyRole(Roles.ADMIN_ROLE) {
        AssetListStorage.Layout storage $ = AssetListStorage.layout();

        $.listed[asset] = false;

        emit AssetDelisted(asset);
    }

    function assetListed(address asset) public view returns (bool) {
        return AssetListStorage.layout().listed[asset];
    }
}
