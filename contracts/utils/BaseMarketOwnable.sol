// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {BaseMarket} from "./BaseMarket.sol";
import {MarketSigner} from "./MarketSigner.sol";

abstract contract BaseMarketOwnable is Initializable, OwnableUpgradeable, BaseMarket, MarketSigner {
    function __BaseMarketOwnable_init(
        address collection_,
        address marketSigner_,
        address whiteList_,
        string memory name,
        string memory version
    ) internal onlyInitializing {
        __Ownable_init_unchained();
        __EIP712_init_unchained(name, version);
        __BaseMarket_init_unchained(collection_, whiteList_);
        __MarketSigner_init_unchained(marketSigner_);
    }

    function reject(uint256 orderId) external onlyOwner {
        _cancel(orderId, _orderSeller(orderId));
    }

    function marketSigner(address marketSigner_) external onlyOwner {
        _setMarketSigner(marketSigner_);
    }

    function _cancel(uint256 orderId, address from) internal virtual;

    function _orderSeller(uint256 orderId) internal virtual returns (address);

    uint256[50] private __gap;
}
