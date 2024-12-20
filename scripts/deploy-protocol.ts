import { AddressParam, Signer } from '../types/environment';
import {
    UpgradedEvent,
    AdminChangedEvent,
} from '../typechain-types/@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol/TransparentUpgradeableProxy';
import { OwnershipTransferredEvent } from '../typechain-types/@openzeppelin/contracts/proxy/transparent/ProxyAdmin';
import { DeployedEvent } from '../typechain-types/contracts/utils/Deployer';
import { deployClassic } from './deploy-classic';

type Params = {
    main: AddressParam;
    usdc: AddressParam;
    minAuctionDurationHours: number;
};

// prettier-ignore
export async function deployProtocol(params: Params, deployer?: Signer) {
    const {
        main,
        usdc,
        minAuctionDurationHours,
    } = params;

    const { ethers } = await import('hardhat');

    const minAuctionDurationSeconds = minAuctionDurationHours * 60 * 60;

    const { receipt } = await deployClassic(
        {
            name: 'Deployer',
            constructorArgs: [main, usdc, minAuctionDurationSeconds],
        },
        deployer,
    );

    const Proxy = await ethers.getContractFactory('TransparentUpgradeableProxy');
    const ProxyAdmin = await ethers.getContractFactory('ProxyAdmin');
    const Deployer = await ethers.getContractFactory('Deployer');

    const AuctionHouse_Proxy_UpgradedEvent = <
        UpgradedEvent.LogDescription
    >(<unknown>Proxy.interface.parseLog(<any>receipt.logs[0]));

    const AuctionHouse_ProxyAdmin_OwnershipTransferredEvent = <
        OwnershipTransferredEvent.LogDescription
    >(<unknown>ProxyAdmin.interface.parseLog(<any>receipt.logs[1]));

    const AuctionHouse_Proxy_AdminChangedEvent = <
        AdminChangedEvent.LogDescription
    >(<unknown>Proxy.interface.parseLog(<any>receipt.logs[2]));

    const ArtToken_Proxy_UpgradedEvent = <
        UpgradedEvent.LogDescription
    >(<unknown>Proxy.interface.parseLog(<any>receipt.logs[3]));

    const ArtToken_ProxyAdmin_OwnershipTransferredEvent = <
        OwnershipTransferredEvent.LogDescription
    >(<unknown>ProxyAdmin.interface.parseLog(<any>receipt.logs[4]));

    const ArtToken_Proxy_AdminChangedEvent = <
        AdminChangedEvent.LogDescription
    >(<unknown>Proxy.interface.parseLog(<any>receipt.logs[5]));

    // const ArtToken_Proxy_InitializedEvent = receipt.logs[6];

    const Deployer_DeployedEvent = <
        DeployedEvent.LogDescription
    >(<unknown>Deployer.interface.parseLog(<any>receipt.logs[7]));

    const artTokenAddr = Deployer_DeployedEvent.args.artToken;
    const artTokenImplAddr = ArtToken_Proxy_UpgradedEvent.args.implementation;
    const artTokenProxyAdminAddr = ArtToken_Proxy_AdminChangedEvent.args.newAdmin;
    const artTokenProxyAdminOwner = ArtToken_ProxyAdmin_OwnershipTransferredEvent.args.newOwner;

    const auctionHouseAddr = Deployer_DeployedEvent.args.auctionHouse;
    const auctionHouseImplAddr = AuctionHouse_Proxy_UpgradedEvent.args.implementation;
    const auctionHouseProxyAdminAddr = AuctionHouse_Proxy_AdminChangedEvent.args.newAdmin;
    const auctionHouseProxyAdminOwner = AuctionHouse_ProxyAdmin_OwnershipTransferredEvent.args.newOwner;

    const artToken = await ethers.getContractAt('ArtToken', artTokenAddr);
    const artTokenProxyAdmin = await ethers.getContractAt('ProxyAdmin', artTokenProxyAdminAddr);

    const auctionHouse = await ethers.getContractAt('AuctionHouse', auctionHouseAddr);
    const auctionHouseProxyAdmin = await ethers.getContractAt('ProxyAdmin', auctionHouseProxyAdminAddr);

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
    };
}
