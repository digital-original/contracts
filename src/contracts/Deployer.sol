// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {TransparentUpgradeableProxy} from "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";
import {Token} from "./Token.sol";
import {Market} from "./Market.sol";
import {Auction} from "./Auction.sol";

contract Deployer {
    event Deployed(address token, address market, address auction);

    constructor(address minter, address marketSigner, address proxyAdminOwner) {
        address token = contractAddressFrom(address(this), 5);

        address market = address(
            new TransparentUpgradeableProxy(address(new Market(token, marketSigner)), proxyAdminOwner, "")
        );

        address auction = address(
            new TransparentUpgradeableProxy(address(new Auction(token, marketSigner)), proxyAdminOwner, "")
        );

        address _token = address(new Token(proxyAdminOwner, minter, market));

        if (token != _token) revert("Incorrect token address");

        emit Deployed(token, market, auction);
    }

    function contractAddressFrom(address deployer, uint256 nonce) public pure returns (address) {
        if (nonce == 0x00)
            return
                address(
                    uint160(uint256(keccak256(abi.encodePacked(bytes1(0xd6), bytes1(0x94), deployer, bytes1(0x80)))))
                );
        if (nonce <= 0x7f)
            return
                address(
                    uint160(
                        uint256(keccak256(abi.encodePacked(bytes1(0xd6), bytes1(0x94), deployer, bytes1(uint8(nonce)))))
                    )
                );
        if (nonce <= 0xff)
            return
                address(
                    uint160(
                        uint256(
                            keccak256(
                                abi.encodePacked(bytes1(0xd7), bytes1(0x94), deployer, bytes1(0x81), uint8(nonce))
                            )
                        )
                    )
                );
        if (nonce <= 0xffff)
            return
                address(
                    uint160(
                        uint256(
                            keccak256(
                                abi.encodePacked(bytes1(0xd8), bytes1(0x94), deployer, bytes1(0x82), uint16(nonce))
                            )
                        )
                    )
                );
        if (nonce <= 0xffffff)
            return
                address(
                    uint160(
                        uint256(
                            keccak256(
                                abi.encodePacked(bytes1(0xd9), bytes1(0x94), deployer, bytes1(0x83), uint24(nonce))
                            )
                        )
                    )
                );
        return
            address(
                uint160(
                    uint256(
                        keccak256(abi.encodePacked(bytes1(0xda), bytes1(0x94), deployer, bytes1(0x84), uint32(nonce)))
                    )
                )
            );
    }
}
