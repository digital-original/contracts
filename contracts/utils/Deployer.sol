// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {TransparentUpgradeableProxy} from "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";
import {ArtToken} from "../art-token/ArtToken.sol";
import {AuctionHouse} from "../auction-house/AuctionHouse.sol";
import {CollabToken} from "../collab-token/CollabToken.sol";

contract Deployer {
    event Deployed(address artToken, address auctionHouse, address collabToken);

    error DeployerIncorrectArtTokenAddress();

    constructor(address platform, address minter, address auctionSigner, address proxyAdminOwner) {
        address artToken = _contractAddressFrom(address(this), 5);

        address auctionHouse = _deployUpgradeable(
            address(new AuctionHouse(artToken, platform, auctionSigner)),
            proxyAdminOwner
        );

        address collabToken = address(new CollabToken(artToken, auctionHouse));

        address artToken_ = _deployUpgradeable(
            address(new ArtToken(minter, auctionHouse, collabToken)),
            proxyAdminOwner
        );

        if (artToken != artToken_) {
            revert DeployerIncorrectArtTokenAddress();
        }

        ArtToken(artToken).initialize();

        emit Deployed(artToken, auctionHouse, collabToken);
    }

    function _deployUpgradeable(address impl, address owner) private returns (address) {
        return address(new TransparentUpgradeableProxy(impl, owner, ""));
    }

    function _contractAddressFrom(address deployer, uint256 nonce) private pure returns (address) {
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
