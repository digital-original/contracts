import { task } from 'hardhat/config';
import { ChainConfig } from '../../types/environment';
import {
    UpgradedEvent,
    AdminChangedEvent,
} from '../../typechain-types/@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol/TransparentUpgradeableProxy';
import { OwnershipTransferredEvent } from '../../typechain-types/@openzeppelin/contracts/proxy/transparent/ProxyAdmin';
import { DeployedEvent } from '../../typechain-types/contracts/utils/Deployer';
import { deployClassic } from '../../scripts/deploy-classic';

/*
npx hardhat deploy --network fork
*/

task('deploy').setAction(async (taskArgs: Record<string, string>, hardhat) => {
    const ethers = hardhat.ethers;
    const chain = hardhat.network;
    const chainId = chain.config.chainId;
    const config = <ChainConfig>(<any>chain.config);

    if (!chainId) throw new Error(`Chain ID is not defined`);

    console.log('-'.repeat(process.stdout.columns));
    console.group('Conditions:');
    console.log(`Chain - ${chain.name}`);
    console.log(`Chain ID - ${chainId}`);
    console.log(`Environment Mode - ${process.env.ENV_MODE}`);
    console.groupEnd();
    console.log('-'.repeat(process.stdout.columns));

    const platformAddr = config.wallets.platform.public;
    const minterAddr = config.wallets.minter.public;
    const auctionSignerAddr = config.wallets.auctionSigner.public;
    const marketSignerAddr = config.wallets.marketSigner.public;
    const proxyAdminOwnerAddr = config.wallets.proxyAdminOwner.public;

    console.log(`Deploying Pool contract...`);
    console.log(`\n`);
    console.group('Params:');
    console.log(`platform: ${platformAddr}`);
    console.log(`minter: ${minterAddr}`);
    console.log(`auctionSigner: ${auctionSignerAddr}`);
    console.log(`marketSigner: ${marketSignerAddr}`);
    console.log(`proxyAdminOwner: ${proxyAdminOwnerAddr}`);
    console.groupEnd();
    console.log(`\n`);
    console.log(`Transaction broadcasting...`);

    const deployerContract = await deployClassic({
        name: 'Deployer',
        constructorArgs: [
            platformAddr,
            minterAddr,
            auctionSignerAddr,
            marketSignerAddr,
            proxyAdminOwnerAddr,
        ],
    });

    const receipt = (await deployerContract.deploymentTransaction()?.wait())!;

    console.log(`Transaction broadcasted`);
    console.log(`Transaction hash - ${receipt.hash}`);
    console.log('-'.repeat(process.stdout.columns));

    const Proxy = await ethers.getContractFactory('TransparentUpgradeableProxy');
    const ProxyAdmin = await ethers.getContractFactory('ProxyAdmin');
    const Deployer = await ethers.getContractFactory('Deployer');

    const AuctionHouse_Proxy_UpgradedEvent = <UpgradedEvent.LogDescription>(
        (<unknown>Proxy.interface.parseLog(<any>receipt.logs[0]))
    );
    const AuctionHouse_ProxyAdmin_OwnershipTransferredEvent = <
        OwnershipTransferredEvent.LogDescription
    >(<unknown>ProxyAdmin.interface.parseLog(<any>receipt.logs[1]));
    const AuctionHouse_Proxy_AdminChangedEvent = <AdminChangedEvent.LogDescription>(
        (<unknown>Proxy.interface.parseLog(<any>receipt.logs[2]))
    );

    const Market_Proxy_UpgradedEvent = <UpgradedEvent.LogDescription>(
        (<unknown>Proxy.interface.parseLog(<any>receipt.logs[3]))
    );
    const Market_ProxyAdmin_OwnershipTransferredEvent = <OwnershipTransferredEvent.LogDescription>(
        (<unknown>ProxyAdmin.interface.parseLog(<any>receipt.logs[4]))
    );
    const Market_Proxy_AdminChangedEvent = <AdminChangedEvent.LogDescription>(
        (<unknown>Proxy.interface.parseLog(<any>receipt.logs[5]))
    );

    const ArtToken_Proxy_UpgradedEvent = <UpgradedEvent.LogDescription>(
        (<unknown>Proxy.interface.parseLog(<any>receipt.logs[6]))
    );
    const ArtToken_ProxyAdmin_OwnershipTransferredEvent = <
        OwnershipTransferredEvent.LogDescription
    >(<unknown>ProxyAdmin.interface.parseLog(<any>receipt.logs[7]));
    const ArtToken_Proxy_AdminChangedEvent = <AdminChangedEvent.LogDescription>(
        (<unknown>Proxy.interface.parseLog(<any>receipt.logs[8]))
    );

    const ArtToken_Proxy_InitializedEvent = <DeployedEvent.LogDescription>(
        (<unknown>Deployer.interface.parseLog(<any>receipt.logs[9]))
    );

    const Deployer_DeployedEvent = <DeployedEvent.LogDescription>(
        (<unknown>Deployer.interface.parseLog(<any>receipt.logs[10]))
    );

    console.group('Result:');
    console.log(`ArtToken Proxy - ${Deployer_DeployedEvent.args.artToken}`);
    console.log(`ArtToken Impl - ${ArtToken_Proxy_UpgradedEvent.args.implementation}`);
    console.log(`ArtToken Proxy Admin - ${ArtToken_Proxy_AdminChangedEvent.args.newAdmin}`);
    console.log(
        `ArtToken Proxy Admin Owner - ${ArtToken_ProxyAdmin_OwnershipTransferredEvent.args.newOwner}`,
    );

    console.log('\n');
    console.log(`AuctionHouse Proxy - ${Deployer_DeployedEvent.args.auctionHouse}`);
    console.log(`AuctionHouse Impl - ${AuctionHouse_Proxy_UpgradedEvent.args.implementation}`);
    console.log(`AuctionHouse Proxy Admin - ${AuctionHouse_Proxy_AdminChangedEvent.args.newAdmin}`);
    console.log(
        `AuctionHouse Proxy Admin Owner - ${AuctionHouse_ProxyAdmin_OwnershipTransferredEvent.args.newOwner}`,
    );

    console.log('\n');
    console.log(`Market Proxy - ${Deployer_DeployedEvent.args.market}`);
    console.log(`Market Impl - ${Market_Proxy_UpgradedEvent.args.implementation}`);
    console.log(`Market Proxy Admin - ${Market_Proxy_AdminChangedEvent.args.newAdmin}`);
    console.log(
        `Market Proxy Admin Owner - ${Market_ProxyAdmin_OwnershipTransferredEvent.args.newOwner}`,
    );

    console.log('\n');
    console.log(`CollabToken - ${Deployer_DeployedEvent.args.collabToken}`);

    console.groupEnd();
    console.log('-'.repeat(process.stdout.columns));
});
