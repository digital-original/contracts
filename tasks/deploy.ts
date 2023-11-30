import { task } from 'hardhat/config';
import { ChainConfig } from '../types/environment';
import {
    UpgradedEvent,
    AdminChangedEvent,
} from '../typechain-types/@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol/TransparentUpgradeableProxy';
import { OwnershipTransferredEvent } from '../typechain-types/@openzeppelin/contracts/proxy/transparent/ProxyAdmin';
import { DeployedEvent } from '../typechain-types/contracts/Deployer';

task('deploy').setAction(async () => {
    const { ethers, network } = await import('hardhat');
    const { deployClassic } = await import('../scripts/deploy-classic');

    const chainConfig = <ChainConfig>(<any>network.config);

    const [deployer] = await ethers.getSigners();

    const deployerContract = await deployClassic(
        {
            name: 'Deployer',
            constructorArgs: [
                chainConfig.wallets.minter.public,
                chainConfig.wallets.marketSigner.public,
                chainConfig.wallets.proxyAdminOwner.public,
            ],
        },
        deployer,
    );

    const receipt = (await deployerContract.deploymentTransaction()?.wait())!;

    const TransparentUpgradeableProxy = await ethers.getContractFactory(
        'TransparentUpgradeableProxy',
    );
    const ProxyAdmin = await ethers.getContractFactory('ProxyAdmin');
    const Deployer = await ethers.getContractFactory('Deployer');

    const token_Proxy_UpgradedEvent = <UpgradedEvent.LogDescription>(
        (<unknown>TransparentUpgradeableProxy.interface.parseLog(<any>receipt.logs[6])!)
    );
    const token_ProxyAdmin_OwnershipTransferredEvent = <OwnershipTransferredEvent.LogDescription>(
        (<unknown>ProxyAdmin.interface.parseLog(<any>receipt.logs[7])!)
    );
    const token_Proxy_AdminChangedEvent = <AdminChangedEvent.LogDescription>(
        (<unknown>TransparentUpgradeableProxy.interface.parseLog(<any>receipt.logs[8])!)
    );

    const market_Proxy_UpgradedEvent = <UpgradedEvent.LogDescription>(
        (<unknown>TransparentUpgradeableProxy.interface.parseLog(<any>receipt.logs[0])!)
    );
    const market_ProxyAdmin_OwnershipTransferredEvent = <OwnershipTransferredEvent.LogDescription>(
        (<unknown>ProxyAdmin.interface.parseLog(<any>receipt.logs[1])!)
    );
    const market_Proxy_AdminChangedEvent = <AdminChangedEvent.LogDescription>(
        (<unknown>TransparentUpgradeableProxy.interface.parseLog(<any>receipt.logs[2])!)
    );

    const auction_Proxy_UpgradedEvent = <UpgradedEvent.LogDescription>(
        (<unknown>TransparentUpgradeableProxy.interface.parseLog(<any>receipt.logs[3])!)
    );
    const auction_ProxyAdmin_OwnershipTransferredEvent = <OwnershipTransferredEvent.LogDescription>(
        (<unknown>ProxyAdmin.interface.parseLog(<any>receipt.logs[4])!)
    );
    const auction_Proxy_AdminChangedEvent = <AdminChangedEvent.LogDescription>(
        (<unknown>TransparentUpgradeableProxy.interface.parseLog(<any>receipt.logs[5])!)
    );

    const deployer_DeployedEvent = <DeployedEvent.LogDescription>(
        (<unknown>Deployer.interface.parseLog(<any>receipt.logs[9])!)
    );

    console.log(`Token Proxy- ${deployer_DeployedEvent.args.token}`);
    console.log(`Token Proxy Admin - ${token_Proxy_AdminChangedEvent.args.newAdmin}`);
    console.log(`Market Proxy - ${deployer_DeployedEvent.args.market}`);
    console.log(`Market Proxy Admin - ${market_Proxy_AdminChangedEvent.args.newAdmin}`);
    console.log(`Auction Proxy - ${deployer_DeployedEvent.args.auction}`);
    console.log(`Auction Proxy Admin - ${auction_Proxy_AdminChangedEvent.args.newAdmin}`);
});
