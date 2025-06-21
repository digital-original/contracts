import { ethers } from 'hardhat';
import { AddressLike, Signer, ZeroAddress } from 'ethers';
import {
    UpgradedEvent,
    AdminChangedEvent,
} from '../../typechain-types/@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol/TransparentUpgradeableProxy';
import { OwnershipTransferredEvent } from '../../typechain-types/@openzeppelin/contracts/proxy/transparent/ProxyAdmin';
import { DeployedEvent } from '../../typechain-types/contracts/tests/DeployerTest';
import { deploy } from '../../scripts/deploy';
import { MIN_AUCTION_DURATION } from '../constants/auction-house';
import { MIN_FEE, MIN_PRICE } from '../constants/min-price-and-fee';
import { REGULATED } from '../constants/art-token';

type Params = {
    signer: AddressLike;
    financier: AddressLike;
    admin?: AddressLike;
};

// prettier-ignore
export async function deployProtocolTest(params: Params, deployer?: Signer) {
    const {
        signer,
        financier,
        admin = ZeroAddress,
    } = params;

    const { receipt } = await deploy(
        {
            name: 'DeployerTest',
            constructorArgs: [signer, financier, admin, MIN_PRICE, MIN_FEE, MIN_AUCTION_DURATION, REGULATED],
        },
        deployer,
    );

    const Proxy = await ethers.getContractFactory('TransparentUpgradeableProxy');
    const ProxyAdmin = await ethers.getContractFactory('ProxyAdmin');
    const Deployer = await ethers.getContractFactory('DeployerTest');

    const ArtToken_Proxy_UpgradedEvent = <
        UpgradedEvent.LogDescription
    >(<unknown>Proxy.interface.parseLog(<any>receipt.logs[0]));

    const ArtToken_ProxyAdmin_OwnershipTransferredEvent = <
        OwnershipTransferredEvent.LogDescription
    >(<unknown>ProxyAdmin.interface.parseLog(<any>receipt.logs[1]));

    const ArtToken_Proxy_AdminChangedEvent = <
        AdminChangedEvent.LogDescription
    >(<unknown>Proxy.interface.parseLog(<any>receipt.logs[2]));

    const AuctionHouse_Proxy_UpgradedEvent = <
        UpgradedEvent.LogDescription
    >(<unknown>Proxy.interface.parseLog(<any>receipt.logs[3]));

    const AuctionHouse_ProxyAdmin_OwnershipTransferredEvent = <
        OwnershipTransferredEvent.LogDescription
    >(<unknown>ProxyAdmin.interface.parseLog(<any>receipt.logs[4]));

    const AuctionHouse_Proxy_AdminChangedEvent = <
        AdminChangedEvent.LogDescription
    >(<unknown>Proxy.interface.parseLog(<any>receipt.logs[5]));

    const Market_Proxy_UpgradedEvent = <
        UpgradedEvent.LogDescription
    >(<unknown>Proxy.interface.parseLog(<any>receipt.logs[6]));

    const Market_ProxyAdmin_OwnershipTransferredEvent = <
        OwnershipTransferredEvent.LogDescription
    >(<unknown>ProxyAdmin.interface.parseLog(<any>receipt.logs[7]));

    const Market_Proxy_AdminChangedEvent = <
        AdminChangedEvent.LogDescription
    >(<unknown>Proxy.interface.parseLog(<any>receipt.logs[8]));

    const Deployer_DeployedEvent = <
        DeployedEvent.LogDescription
    >(<unknown>Deployer.interface.parseLog(<any>receipt.logs[9]));

    const artTokenAddr = Deployer_DeployedEvent.args.artToken;
    const artTokenImplAddr = ArtToken_Proxy_UpgradedEvent.args.implementation;
    const artTokenProxyAdminAddr = ArtToken_Proxy_AdminChangedEvent.args.newAdmin;
    const artTokenProxyAdminOwner = ArtToken_ProxyAdmin_OwnershipTransferredEvent.args.newOwner;

    const auctionHouseAddr = Deployer_DeployedEvent.args.auctionHouse;
    const auctionHouseImplAddr = AuctionHouse_Proxy_UpgradedEvent.args.implementation;
    const auctionHouseProxyAdminAddr = AuctionHouse_Proxy_AdminChangedEvent.args.newAdmin;
    const auctionHouseProxyAdminOwner = AuctionHouse_ProxyAdmin_OwnershipTransferredEvent.args.newOwner;

    const marketAddr = Deployer_DeployedEvent.args.market;
    const marketImplAddr = Market_Proxy_UpgradedEvent.args.implementation;
    const marketProxyAdminAddr = Market_Proxy_AdminChangedEvent.args.newAdmin;
    const marketProxyAdminOwner = Market_ProxyAdmin_OwnershipTransferredEvent.args.newOwner;

    const usdcAddr = Deployer_DeployedEvent.args.usdc;

    const artToken = await ethers.getContractAt('ArtToken', artTokenAddr);
    const artTokenProxyAdmin = await ethers.getContractAt('ProxyAdmin', artTokenProxyAdminAddr);

    const auctionHouse = await ethers.getContractAt('AuctionHouse', auctionHouseAddr);
    const auctionHouseProxyAdmin = await ethers.getContractAt('ProxyAdmin', auctionHouseProxyAdminAddr);

    const market = await ethers.getContractAt('Market', marketAddr);
    const marketProxyAdmin = await ethers.getContractAt('ProxyAdmin', marketProxyAdminAddr);

    const usdc = await ethers.getContractAt('USDC', usdcAddr);

    return {
        receipt,

        artToken,
        artTokenAddr,
        artTokenProxyAdmin,
        artTokenProxyAdminAddr,
        artTokenProxyAdminOwner,
        artTokenImplAddr,

        auctionHouse,
        auctionHouseAddr,
        auctionHouseProxyAdmin,
        auctionHouseProxyAdminAddr,
        auctionHouseProxyAdminOwner,
        auctionHouseImplAddr,

        market,
        marketAddr,
        marketProxyAdmin,
        marketProxyAdminAddr,
        marketProxyAdminOwner,
        marketImplAddr,

        usdcAddr,
        usdc,
    };
}
