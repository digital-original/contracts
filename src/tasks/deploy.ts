import { task } from 'hardhat/config';
import { ChainConfig } from '../typedefs';
import {
    UpgradedEvent,
    AdminChangedEvent,
} from '../../typechain-types/@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol/TransparentUpgradeableProxy';
import { OwnershipTransferredEvent } from '../../typechain-types/@openzeppelin/contracts/proxy/transparent/ProxyAdmin';
import { OwnershipTransferredEvent as TokenOwnershipTransferredEvent } from '../../typechain-types/src/contracts/Token';
import { DeployedEvent } from '../../typechain-types/src/contracts/Deployer';

task('deploy').setAction(async () => {
    const { ethers, network } = await import('hardhat');
    const { deployClassic } = await import('../scripts/deploy-classic');

    const chainConfig = <ChainConfig>(<any>network.config);

    const [deployer] = await ethers.getSigners();

    const deployerContract = await deployClassic({
        name: 'Deployer',
        constructorArgs: [
            chainConfig.wallets.minter.public,
            chainConfig.wallets.marketSigner.public,
            chainConfig.wallets.proxyAdminOwner.public,
        ],
        deployer,
    });

    const receipt = (await deployerContract.deploymentTransaction()?.wait())!;

    const TransparentUpgradeableProxy = await ethers.getContractFactory(
        'TransparentUpgradeableProxy',
    );
    const ProxyAdmin = await ethers.getContractFactory('ProxyAdmin');
    const Token = await ethers.getContractFactory('Token');
    const Deployer = await ethers.getContractFactory('Deployer');

    const proxyMarketUpgradedEvent = <UpgradedEvent.LogDescription>(
        (<unknown>TransparentUpgradeableProxy.interface.parseLog(<any>receipt.logs[0])!)
    );
    const proxyAdminMarketOwnershipTransferredEvent = <OwnershipTransferredEvent.LogDescription>(
        (<unknown>ProxyAdmin.interface.parseLog(<any>receipt.logs[1])!)
    );
    const proxyMarketAdminChangedEvent = <AdminChangedEvent.LogDescription>(
        (<unknown>TransparentUpgradeableProxy.interface.parseLog(<any>receipt.logs[2])!)
    );
    const proxyAuctionUpgradedEvent = <UpgradedEvent.LogDescription>(
        (<unknown>TransparentUpgradeableProxy.interface.parseLog(<any>receipt.logs[3])!)
    );
    const proxyAdminAuctionOwnershipTransferredEvent = <OwnershipTransferredEvent.LogDescription>(
        (<unknown>ProxyAdmin.interface.parseLog(<any>receipt.logs[4])!)
    );
    const proxyAuctionAdminChangedEvent = <AdminChangedEvent.LogDescription>(
        (<unknown>TransparentUpgradeableProxy.interface.parseLog(<any>receipt.logs[5])!)
    );
    const tokenOwnershipTransferredEvent = <TokenOwnershipTransferredEvent.LogDescription>(
        (<unknown>Token.interface.parseLog(<any>receipt.logs[6])!)
    );
    const deployerDeployedEvent = <DeployedEvent.LogDescription>(
        (<unknown>Deployer.interface.parseLog(<any>receipt.logs[7])!)
    );

    console.log(`Token - ${deployerDeployedEvent.args.token}`);
    console.log(`Market - ${deployerDeployedEvent.args.market}`);
});
