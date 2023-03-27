// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {BaseMarket} from "./BaseMarket.sol";
import {MarketSigner} from "./MarketSigner.sol";

/**
 * @title BaseMarketOwnable
 * @notice Abstract contract BaseMarketOwnable.
 * @notice Upgradeable Contract based on [OpenZeppelin](https://docs.openzeppelin.com/) library.
 */
abstract contract BaseMarketOwnable is Initializable, OwnableUpgradeable, BaseMarket, MarketSigner {
    /**
     * @param collection_ ERC-721 contract address.
     * @param marketSigner_ Data signer address.
     * @param whiteList_ WhiteList contract address.
     * @param name Domain name.
     * @param version Domain version.
     * @dev Initializes contract.
     *   See <https://docs.openzeppelin.com/contracts/4.x/upgradeable#multiple-inheritance>.
     */
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

    /**
     * @notice Cancels order.
     * @param orderId Order id.
     * @dev Only owner can invoke method.
     */
    function reject(uint256 orderId) external onlyOwner {
        _cancel(orderId, _tokenSeller(orderId));
    }

    /**
     * @notice Changes market signer.
     * @param marketSigner_ Market signer address.
     * @dev Only owner can invoke method.
     */
    function marketSigner(address marketSigner_) external onlyOwner {
        _setMarketSigner(marketSigner_);
    }

    /**
     * @param orderId Order id.
     * @param from Canceller address.
     * @dev Cancels order.
     */
    function _cancel(uint256 orderId, address from) internal virtual;

    /**
     * @param orderId Order id.
     * @return address Token seller address.
     */
    function _tokenSeller(uint256 orderId) internal virtual returns (address);

    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     *   variables without shifting down storage in the inheritance chain.
     *   See <https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps>.
     */
    uint256[50] private __gap;
}
