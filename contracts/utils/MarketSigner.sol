// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {EIP712Upgradeable} from "@openzeppelin/contracts-upgradeable/utils/cryptography/EIP712Upgradeable.sol";
import {ECDSAUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/cryptography/ECDSAUpgradeable.sol";
import {ShortStrings, ShortString} from "@openzeppelin/contracts/utils/ShortStrings.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";

/**
 * @title MarketSigner
 *
 * @notice Abstract contract MarketSigner provides signature validation logic.
 * @notice Upgradeable Contract based on [OpenZeppelin](https://docs.openzeppelin.com/) library
 *   and [EIP-712](https://eips.ethereum.org/EIPS/eip-712) standard.
 */
// TODO: Think about using not upgradable EIP712 contract
abstract contract MarketSigner is Initializable, EIP712Upgradeable {
    /**
     * @dev Data type hash according to EIP-712.
     */
    // prettier-ignore
    bytes32 public constant ORDER_TYPE_HASH =
        keccak256(
            "Order("
                "address seller,"
                "uint256 tokenId,"
                "uint256 price,"
                "address[] participants,"
                "uint256[] shares,"
                "uint256 expiredBlock"
            ")"
        );

    /**
     * @dev This variable store a name for `EIP712Upgradeable`.
     */
    ShortString private immutable _eip712Name;

    /**
     * @dev This variable store a version for `EIP712Upgradeable`.
     */
    ShortString private immutable _eip712Version;

    /**
     * @dev Order signer address.
     */
    address private immutable _marketSigner;

    /**
     * @param marketSigner_ Order signer address.
     * @param eip712Name_ Domain name according to EIP-712, no more than 31 bytes.
     * @param eip712Version_ Domain version according to EIP-712, no more than 31 bytes.
     */
    constructor(address marketSigner_, string memory eip712Name_, string memory eip712Version_) {
        _marketSigner = marketSigner_;
        _eip712Name = ShortStrings.toShortString(eip712Name_);
        _eip712Version = ShortStrings.toShortString(eip712Version_);
    }

    /**
     * @dev Initializes contract.
     *   See <https://docs.openzeppelin.com/contracts/4.x/upgradeable#multiple-inheritance>.
     */
    function __MarketSigner_init() internal onlyInitializing {
        __MarketSigner_init_unchained();
    }

    /**
     * @dev Initializes contract.
     *   See <https://docs.openzeppelin.com/contracts/4.x/upgradeable#multiple-inheritance>.
     */
    function __MarketSigner_init_unchained() internal onlyInitializing {}

    /**
     * @return Order signer address.
     */
    function marketSigner() external view returns (address) {
        return _marketSigner;
    }

    /**
     * @dev Checks `expiredBlock`, hashes data and recovers signature's signer,
     *   compares signer with market signer. Throws if data is valid.
     *
     * @param seller Seller address.
     * @param tokenId Token id.
     * @param price Token price.
     * @param expiredBlock Block number until which `signature` is valid.
     * @param participants Array with participants addresses.
     * @param shares Array with shares amounts.
     * @param signature Signature according to EIP-712.
     */
    function _validateSignature(
        address seller,
        uint256 tokenId,
        uint256 price,
        uint256 expiredBlock,
        address[] memory participants,
        uint256[] memory shares,
        bytes memory signature
    ) internal view {
        require(expiredBlock > block.number, "MarketSigner: signature is expired");

        bytes32 hash = _hashTypedDataV4(
            keccak256(
                abi.encode(
                    ORDER_TYPE_HASH,
                    seller,
                    tokenId,
                    price,
                    keccak256(abi.encodePacked(participants)),
                    keccak256(abi.encodePacked(shares)),
                    expiredBlock
                )
            )
        );

        require(_marketSigner == ECDSAUpgradeable.recover(hash, signature), "MarketSigner: unauthorized");
    }

    /**
     * @dev The method overrides `EIP712Upgradeable._EIP712Name`
     *   to get the name from the immutable variable instead of а state.
     */
    function _EIP712Name() internal view override returns (string memory name) {
        return ShortStrings.toString(_eip712Name);
    }

    /**
     * @dev The method overrides `EIP712Upgradeable._EIP712Version`
     *   to get the version from the immutable variable instead of а state.
     */
    function _EIP712Version() internal view override returns (string memory) {
        return ShortStrings.toString(_eip712Version);
    }

    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     *   variables without shifting down storage in the inheritance chain.
     *   See <https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps>.
     */
    uint256[50] private __gap;
}
