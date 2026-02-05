// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.20;

import {Deployment} from "../utils/Deployment.sol";
import {ArtToken} from "../art-token/ArtToken.sol";
import {AuctionHouse} from "../auction-house/AuctionHouse.sol";
import {Roles} from "../utils/Roles.sol";
import {MarketMock} from "../tests/MarketMock.sol";
import {USDC} from "../tests/USDC.sol";

contract DeployerTest {
    event Deployed(address artToken, address auctionHouse, address marketMock, address usdc);

    constructor(
        address signer,
        address financier,
        uint256 minPrice,
        uint256 minFee,
        uint256 minAuctionDuration,
        bool regulated
    ) {
        address marketMock = address(new MarketMock());
        address usdc = address(new USDC());
        address calculatedArtTokenProxy = Deployment.calculateContractAddress(address(this), 5);
        address calculatedAuctionHouseProxy = Deployment.calculateContractAddress(address(this), 6);

        {
            address artTokenImpl = address(
                new ArtToken(
                    address(calculatedArtTokenProxy),
                    address(this),
                    address(calculatedAuctionHouseProxy),
                    address(usdc),
                    minPrice,
                    minFee,
                    regulated
                )
            );

            address auctionHouseImpl = address(
                new AuctionHouse(
                    address(calculatedAuctionHouseProxy),
                    address(this),
                    address(calculatedArtTokenProxy),
                    address(usdc),
                    minAuctionDuration,
                    minPrice,
                    minFee
                )
            );

            address artTokenProxy = Deployment.deployUpgradeableContract(artTokenImpl, address(this));
            address auctionHouseProxy = Deployment.deployUpgradeableContract(auctionHouseImpl, address(this));

            if (artTokenProxy != calculatedArtTokenProxy) revert DeployerIncorrectAddress();
            if (auctionHouseProxy != calculatedAuctionHouseProxy) revert DeployerIncorrectAddress();

            emit Deployed(artTokenProxy, auctionHouseProxy, marketMock, usdc);
        }

        ArtToken(calculatedArtTokenProxy).transferUniqueRole(Roles.SIGNER_ROLE, signer);
        ArtToken(calculatedArtTokenProxy).transferUniqueRole(Roles.FINANCIAL_ROLE, financier);
        ArtToken(calculatedArtTokenProxy).grantRole(Roles.PARTNER_ROLE, address(calculatedAuctionHouseProxy));
        ArtToken(calculatedArtTokenProxy).grantRole(Roles.PARTNER_ROLE, address(marketMock));

        AuctionHouse(calculatedAuctionHouseProxy).transferUniqueRole(Roles.FINANCIAL_ROLE, financier);
        AuctionHouse(calculatedAuctionHouseProxy).transferUniqueRole(Roles.SIGNER_ROLE, signer);
    }

    error DeployerIncorrectAddress();
}
