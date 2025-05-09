// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.20;

import {TransparentUpgradeableProxy} from "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";
import {ArtToken} from "../art-token/ArtToken.sol";
import {AuctionHouse} from "../auction-house/AuctionHouse.sol";

contract Deployer {
    event Deployed(address artToken, address auctionHouse);

    error DeployerIncorrectAddress();

    constructor(
        string memory name,
        string memory symbol,
        address main,
        address usdc,
        uint256 minPrice,
        uint256 minFee,
        uint256 minAuctionDuration,
        bool regulated
    ) {
        address _artToken = _contractAddressFrom(address(this), 4);

        address auctionHouseImpl = address(
            new AuctionHouse(main, _artToken, usdc, minAuctionDuration, minPrice, minFee)
        );
        address auctionHouse = _deployUpgradeable(auctionHouseImpl, main);

        address artTokenImpl = address(new ArtToken(main, auctionHouse, usdc, minPrice, minFee, regulated));
        address artToken = _deployUpgradeable(artTokenImpl, main);

        if (_artToken != artToken) {
            revert DeployerIncorrectAddress();
        }

        ArtToken(_artToken).initialize(name, symbol);

        emit Deployed(_artToken, auctionHouse);
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
