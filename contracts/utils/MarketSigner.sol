// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {EIP712Upgradeable} from "@openzeppelin/contracts-upgradeable/utils/cryptography/EIP712Upgradeable.sol";
import {ECDSAUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/cryptography/ECDSAUpgradeable.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IWhiteList} from "../interfaces/IWhiteList.sol";

abstract contract MarketSigner is Initializable, EIP712Upgradeable {
    bytes32 public constant ORDER_TYPE =
        keccak256(
            "Order(address seller,uint256 tokenId,uint256 price,address[] participants,uint256[] shares,uint256 expiredBlock)"
        );

    address private _marketSigner;

    function __MarketSigner_init(
        address marketSigner_,
        string memory name,
        string memory version
    ) internal onlyInitializing {
        __EIP712_init_unchained(name, version);
        __MarketSigner_init_unchained(marketSigner_);
    }

    function __MarketSigner_init_unchained(address marketSigner_) internal onlyInitializing {
        _setMarketSigner(marketSigner_);
    }

    function marketSigner() external view returns (address) {
        return _marketSigner;
    }

    function _setMarketSigner(address marketSigner_) internal {
        require(marketSigner_ != address(0), "MarketSigner: invalid signer address");

        _marketSigner = marketSigner_;
    }

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

    uint256[49] private __gap;
}
