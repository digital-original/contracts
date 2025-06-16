// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.20;

import {TransparentUpgradeableProxy} from "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";

/**
 * @title Deployment
 *
 * @notice Helper library that simplifies contract deployment logic used in the
 *         protocol scripts.
 *
 * @dev Currently exposes two low-level utilities:
 *      1. {deployUpgradeableContract} — deploys an `TransparentUpgradeableProxy`
 *         pointing to an implementation contract.
 *      2. {calculateContractAddress} — deterministic computation of the address
 *         of a contract that would be deployed by `account` at a given nonce
 *         (matching the algorithm used by the EVM).
 */
library Deployment {
    /**
     * @notice Deploys a `TransparentUpgradeableProxy` with the provided
     *         implementation and admin.
     *
     * @param impl            Address of the implementation contract that the
     *                        proxy will delegate‐call to.
     * @param proxyAdminOwner Address that will become the owner of the proxy's
     *                        admin contract.
     *
     * @return proxy Address of the newly deployed proxy.
     */
    function deployUpgradeableContract(address impl, address proxyAdminOwner) internal returns (address proxy) {
        return address(new TransparentUpgradeableProxy(impl, proxyAdminOwner, ""));
    }

    /**
     * @notice Predicts the address of a future deployment by `account` at the
     *         specified nonce.
     *
     * @dev Mirrors the algorithm used by the `CREATE` opcode. Only supports
     *      nonces up to `0xffffff` to avoid unnecessary dynamic memory in
     *      encoding logic.
     *
     * @param account Deployer address.
     * @param nonce   Nonce of the deploying account at the time of the future
     *                deployment.
     *
     * @return predicted Address the contract will be deployed to.
     */
    function calculateContractAddress(address account, uint256 nonce) internal pure returns (address predicted) {
        if (nonce == 0x00) {
            return
                address(
                    uint160(uint256(keccak256(abi.encodePacked(bytes1(0xd6), bytes1(0x94), account, bytes1(0x80)))))
                );
        } else if (nonce <= 0x7f) {
            return
                address(
                    uint160(
                        uint256(keccak256(abi.encodePacked(bytes1(0xd6), bytes1(0x94), account, bytes1(uint8(nonce)))))
                    )
                );
        } else if (nonce <= 0xff) {
            return
                address(
                    uint160(
                        uint256(
                            keccak256(abi.encodePacked(bytes1(0xd7), bytes1(0x94), account, bytes1(0x81), uint8(nonce)))
                        )
                    )
                );
        } else if (nonce <= 0xffff) {
            return
                address(
                    uint160(
                        uint256(
                            keccak256(
                                abi.encodePacked(bytes1(0xd8), bytes1(0x94), account, bytes1(0x82), uint16(nonce))
                            )
                        )
                    )
                );
        } else if (nonce <= 0xffffff) {
            return
                address(
                    uint160(
                        uint256(
                            keccak256(
                                abi.encodePacked(bytes1(0xd9), bytes1(0x94), account, bytes1(0x83), uint24(nonce))
                            )
                        )
                    )
                );
        } else {
            return
                address(
                    uint160(
                        uint256(
                            keccak256(
                                abi.encodePacked(bytes1(0xda), bytes1(0x94), account, bytes1(0x84), uint32(nonce))
                            )
                        )
                    )
                );
        }
    }
}
