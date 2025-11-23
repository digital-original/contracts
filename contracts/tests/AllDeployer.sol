// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.20;

import {Deployment} from "../utils/Deployment.sol";
import {ArtToken} from "../art-token/ArtToken.sol";
import {AuctionHouse} from "../auction-house/AuctionHouse.sol";
import {Market} from "../market/Market.sol";
import {Roles} from "../utils/Roles.sol";
import {USDC} from "../tests/USDC.sol";

contract AllDeployer {
    event Deployed(address artToken, address auctionHouse, address market, address usdc);

    constructor(address signer, address financier, address admin, uint256 minAuctionDuration) {
        address usdc = address(new USDC());
        address artTokenProxy = Deployment.calculateContractAddress(address(this), 5);
        address auctionHouseProxy = Deployment.calculateContractAddress(address(this), 6);
        address marketProxy = Deployment.calculateContractAddress(address(this), 7);

        {
            address artTokenImpl = address(
                new ArtToken(
                    artTokenProxy,
                    address(this),
                    auctionHouseProxy //
                )
            );

            address auctionHouseImpl = address(
                new AuctionHouse(
                    auctionHouseProxy,
                    address(this),
                    artTokenProxy,
                    minAuctionDuration //
                )
            );

            address marketImpl = address(
                new Market(
                    marketProxy,
                    address(this) //
                )
            );

            address _artTokenProxy = Deployment.deployUpgradeableContract(artTokenImpl, address(this));
            address _auctionHouseProxy = Deployment.deployUpgradeableContract(auctionHouseImpl, address(this));
            address _marketProxy = Deployment.deployUpgradeableContract(marketImpl, address(this));

            if (_artTokenProxy != artTokenProxy) revert DeployerIncorrectAddress();
            if (_auctionHouseProxy != auctionHouseProxy) revert DeployerIncorrectAddress();
            if (_marketProxy != marketProxy) revert DeployerIncorrectAddress();

            emit Deployed(artTokenProxy, auctionHouseProxy, marketProxy, usdc);
        }

        ArtToken(artTokenProxy).transferUniqueRole(Roles.SIGNER_ROLE, signer);
        ArtToken(artTokenProxy).transferUniqueRole(Roles.FINANCIAL_ROLE, financier);
        ArtToken(artTokenProxy).grantRole(Roles.PARTNER_ROLE, auctionHouseProxy);
        ArtToken(artTokenProxy).grantRole(Roles.PARTNER_ROLE, marketProxy);
        ArtToken(artTokenProxy).grantRole(Roles.ADMIN_ROLE, address(this));
        ArtToken(artTokenProxy).updateCurrencyStatus(usdc, true);
        if (admin != address(0)) ArtToken(artTokenProxy).grantRole(Roles.ADMIN_ROLE, admin);

        AuctionHouse(auctionHouseProxy).transferUniqueRole(Roles.FINANCIAL_ROLE, financier);
        AuctionHouse(auctionHouseProxy).transferUniqueRole(Roles.SIGNER_ROLE, signer);
        AuctionHouse(auctionHouseProxy).grantRole(Roles.ADMIN_ROLE, address(this));
        AuctionHouse(auctionHouseProxy).updateCurrencyStatus(usdc, true);
        if (admin != address(0)) AuctionHouse(auctionHouseProxy).grantRole(Roles.ADMIN_ROLE, admin);

        Market(marketProxy).transferUniqueRole(Roles.SIGNER_ROLE, signer);
        Market(marketProxy).transferUniqueRole(Roles.FINANCIAL_ROLE, financier);
        Market(marketProxy).grantRole(Roles.ADMIN_ROLE, address(this));
        Market(marketProxy).updateCurrencyStatus(usdc, true);
        if (admin != address(0)) Market(marketProxy).grantRole(Roles.ADMIN_ROLE, admin);
    }

    error DeployerIncorrectAddress();
}
