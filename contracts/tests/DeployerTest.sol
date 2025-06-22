// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.20;

import {Deployment} from "../utils/Deployment.sol";
import {ArtToken} from "../art-token/ArtToken.sol";
import {AuctionHouse} from "../auction-house/AuctionHouse.sol";
import {Market} from "../market/Market.sol";
import {Roles} from "../utils/Roles.sol";
import {USDC} from "../tests/USDC.sol";

contract DeployerTest {
    event Deployed(address artToken, address auctionHouse, address market, address usdc);

    constructor(
        address signer,
        address financier,
        address admin,
        uint256 minPrice,
        uint256 minFee,
        uint256 minAuctionDuration,
        bool regulated
    ) {
        address usdc = address(new USDC());
        address calculatedArtTokenProxy = Deployment.calculateContractAddress(address(this), 5);
        address calculatedAuctionHouseProxy = Deployment.calculateContractAddress(address(this), 6);
        address calculatedMarketProxy = Deployment.calculateContractAddress(address(this), 7);

        {
            address artTokenImpl = address(
                new ArtToken(
                    address(calculatedArtTokenProxy),
                    address(this),
                    calculatedAuctionHouseProxy,
                    address(usdc),
                    minPrice,
                    minFee,
                    regulated
                )
            );

            address auctionHouseImpl = address(
                new AuctionHouse(
                    calculatedAuctionHouseProxy,
                    address(this),
                    calculatedArtTokenProxy,
                    address(usdc),
                    minAuctionDuration,
                    minPrice,
                    minFee
                )
            );

            address marketImpl = address(new Market(calculatedMarketProxy, address(this)));

            address artTokenProxy = Deployment.deployUpgradeableContract(artTokenImpl, address(this));
            address auctionHouseProxy = Deployment.deployUpgradeableContract(auctionHouseImpl, address(this));
            address marketProxy = Deployment.deployUpgradeableContract(marketImpl, address(this));

            if (artTokenProxy != calculatedArtTokenProxy) revert DeployerIncorrectAddress();
            if (auctionHouseProxy != calculatedAuctionHouseProxy) revert DeployerIncorrectAddress();
            if (marketProxy != calculatedMarketProxy) revert DeployerIncorrectAddress();

            emit Deployed(artTokenProxy, auctionHouseProxy, marketProxy, usdc);
        }

        ArtToken(calculatedArtTokenProxy).transferUniqueRole(Roles.SIGNER_ROLE, signer);
        ArtToken(calculatedArtTokenProxy).transferUniqueRole(Roles.FINANCIAL_ROLE, financier);
        ArtToken(calculatedArtTokenProxy).grantRole(Roles.PARTNER_ROLE, address(calculatedAuctionHouseProxy));
        ArtToken(calculatedArtTokenProxy).grantRole(Roles.PARTNER_ROLE, address(calculatedMarketProxy));

        AuctionHouse(calculatedAuctionHouseProxy).transferUniqueRole(Roles.FINANCIAL_ROLE, financier);
        AuctionHouse(calculatedAuctionHouseProxy).transferUniqueRole(Roles.SIGNER_ROLE, signer);

        Market(calculatedMarketProxy).transferUniqueRole(Roles.SIGNER_ROLE, signer);
        Market(calculatedMarketProxy).transferUniqueRole(Roles.FINANCIAL_ROLE, financier);
        if (admin != address(0)) Market(calculatedMarketProxy).grantRole(Roles.ADMIN_ROLE, admin);
        Market(calculatedMarketProxy).grantRole(Roles.ADMIN_ROLE, address(this));
        Market(calculatedMarketProxy).updateCurrencyStatus(address(usdc), true);
    }

    error DeployerIncorrectAddress();
}
