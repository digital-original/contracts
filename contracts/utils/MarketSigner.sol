// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {EIP712Upgradeable} from "@openzeppelin/contracts-upgradeable/utils/cryptography/EIP712Upgradeable.sol";
import {ECDSAUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/cryptography/ECDSAUpgradeable.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IWhiteList} from "../interfaces/IWhiteList.sol";

/**
 * @title MarketSigner
 * @notice Abstract contract MarketSigner provides signature validation logic.
 * @notice Upgradeable Contract based on [OpenZeppelin](https://docs.openzeppelin.com/) library
 *   and [EIP-712](https://eips.ethereum.org/EIPS/eip-712) standard.
 */
abstract contract MarketSigner is Initializable, EIP712Upgradeable {
    /// @dev Data type according to EIP-712
    bytes32 public constant ORDER_TYPE =
        keccak256(
            "Order(address seller,uint256 tokenId,uint256 price,address[] participants,uint256[] shares,uint256 expiredBlock)"
        );

    /// @dev Data signer address
    address private _marketSigner;

    /**
     * @param marketSigner_ Data signer address.
     * @param name Domain name according to EIP-712
     * @param version Domain version according to EIP-712
     * @dev Initializes contract.
     *   See <https://docs.openzeppelin.com/contracts/4.x/upgradeable#multiple-inheritance>.
     */
    function __MarketSigner_init(
        address marketSigner_,
        string memory name,
        string memory version
    ) internal onlyInitializing {
        __EIP712_init_unchained(name, version);
        __MarketSigner_init_unchained(marketSigner_);
    }

    /**
     * @dev Initializes contract.
     *   See <https://docs.openzeppelin.com/contracts/4.x/upgradeable#multiple-inheritance>.
     */
    function __MarketSigner_init_unchained(address marketSigner_) internal onlyInitializing {
        _setMarketSigner(marketSigner_);
    }

    /// @return address Data signer address.
    function marketSigner() external view returns (address) {
        return _marketSigner;
    }

    /**
     * @param marketSigner_ Data signer address.
     * @dev Change market signer.
     */
    function _setMarketSigner(address marketSigner_) internal {
        require(marketSigner_ != address(0), "MarketSigner: invalid signer address");

        _marketSigner = marketSigner_;
    }

    /**
     * @param seller Seller address.
     * @param tokenId Token id.
     * @param price Token price.
     * @param expiredBlock Block number until which `signature` is valid.
     * @param participants Array with participants addresses.
     * @param shares Array with shares amounts.
     * @param signature Signature according to EIP-712.
     * @return bool Returns true if signature is valid.
     * @dev Checks `expiredBlock`, hashes data and recovers signature's signer,
     *   compares signer with market signer.
     */
    function _validateSignature(
        address seller,
        uint256 tokenId,
        uint256 price,
        uint256 expiredBlock,
        address[] memory participants,
        uint256[] memory shares,
        bytes memory signature
    ) internal view returns (bool) {
        if (expiredBlock < block.number) {
            return false;
        }

        bytes32 hash = _hashTypedDataV4(
            keccak256(
                abi.encode(
                    ORDER_TYPE,
                    seller,
                    tokenId,
                    price,
                    keccak256(abi.encodePacked(participants)),
                    keccak256(abi.encodePacked(shares)),
                    expiredBlock
                )
            )
        );

        return _marketSigner == ECDSAUpgradeable.recover(hash, signature);
    }

    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     *   variables without shifting down storage in the inheritance chain.
     *   See <https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps>.
     */
    uint256[49] private __gap;
}
