// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IAssetList {
    event AssetListed(address indexed asset);
    event AssetDelisted(address indexed asset);

    function listAsset(address asset) external;

    function delistAsset(address asset) external;

    function assetListed(address asset) external view returns (bool);
}
