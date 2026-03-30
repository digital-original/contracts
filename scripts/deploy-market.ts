import { AddressLike, Signer } from 'ethers';
import {
    UpgradedEvent,
    AdminChangedEvent,
} from '../typechain-types/@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol/TransparentUpgradeableProxy';
import { OwnershipTransferredEvent } from '../typechain-types/@openzeppelin/contracts/proxy/transparent/ProxyAdmin';
import { DeployedEvent } from '../typechain-types/contracts/utils/MarketDeployer';
import { deploy } from './deploy';

type Params = {
    main: AddressLike;
    wrappedEther: AddressLike;
};

// prettier-ignore
export async function deployMarket(params: Params, deployer?: Signer) {
    const { ethers } = await import('hardhat');

    const { main, wrappedEther } = params;

    const { receipt } = await deploy(
        {
            name: 'MarketDeployer',
            constructorArgs: [main, wrappedEther],
        },
        deployer,
    );

    const Proxy = await ethers.getContractFactory('TransparentUpgradeableProxy');
    const ProxyAdmin = await ethers.getContractFactory('ProxyAdmin');
    const Deployer = await ethers.getContractFactory('MarketDeployer');

    const Market_Proxy_UpgradedEvent = <
        UpgradedEvent.LogDescription
    >(<unknown>Proxy.interface.parseLog(<any>receipt.logs[0]));

    const Market_ProxyAdmin_OwnershipTransferredEvent = <
        OwnershipTransferredEvent.LogDescription
    >(<unknown>ProxyAdmin.interface.parseLog(<any>receipt.logs[1]));

    const Market_Proxy_AdminChangedEvent = <
        AdminChangedEvent.LogDescription
    >(<unknown>Proxy.interface.parseLog(<any>receipt.logs[2]));

    const Deployer_DeployedEvent = <
        DeployedEvent.LogDescription
    >(<unknown>Deployer.interface.parseLog(<any>receipt.logs[3]));

    const marketAddr = Deployer_DeployedEvent.args.market;
    const marketImplAddr = Market_Proxy_UpgradedEvent.args.implementation;
    const marketProxyAdminAddr = Market_Proxy_AdminChangedEvent.args.newAdmin;
    const marketProxyAdminOwnerAddr = Market_ProxyAdmin_OwnershipTransferredEvent.args.newOwner;

    const market = await ethers.getContractAt('Market', marketAddr);
    const marketProxyAdmin = await ethers.getContractAt('ProxyAdmin', marketProxyAdminAddr);

    return {
        receipt,

        market,
        marketAddr,
        marketProxyAdmin,
        marketProxyAdminAddr,
        marketProxyAdminOwnerAddr,
        marketImplAddr,
    };
}
