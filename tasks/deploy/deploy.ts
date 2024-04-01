import { task } from 'hardhat/config';
import { ChainConfig } from '../../types/environment';
import { deployContracts } from '../../scripts/deploy-contracts';

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
    const proxyAdminOwnerAddr = config.wallets.proxyAdminOwner.public;

    console.log(`Deploying contracts...`);
    console.log(`\n`);
    console.group('Params:');
    console.log(`platform: ${platformAddr}`);
    console.log(`minter: ${minterAddr}`);
    console.log(`auctionSigner: ${auctionSignerAddr}`);
    console.log(`proxyAdminOwner: ${proxyAdminOwnerAddr}`);
    console.groupEnd();
    console.log(`\n`);
    console.log(`Transaction broadcasting...`);

    const {
        receipt,

        artTokenAddr,
        artTokenImplAddr,
        artTokenProxyAdminAddr,
        artTokenProxyAdminOwner,

        auctionHouseAddr,
        auctionHouseImplAddr,
        auctionHouseProxyAdminAddr,
        auctionHouseProxyAdminOwner,

        collabTokenAddr,
    } = await deployContracts({
        platform: platformAddr,
        minter: minterAddr,
        auctionSigner: auctionSignerAddr,
        proxyAdminOwner: proxyAdminOwnerAddr,
    });

    console.log(`Transaction broadcasted`);
    console.log(`Transaction hash - ${receipt.hash}`);
    console.log('-'.repeat(process.stdout.columns));

    console.group('Result:');
    console.log(`ArtToken Proxy - ${artTokenAddr}`);
    console.log(`ArtToken Impl - ${artTokenImplAddr}`);
    console.log(`ArtToken Proxy Admin - ${artTokenProxyAdminAddr}`);
    console.log(`ArtToken Proxy Admin Owner - ${artTokenProxyAdminOwner}`);

    console.log('\n');
    console.log(`AuctionHouse Proxy - ${auctionHouseAddr}`);
    console.log(`AuctionHouse Impl - ${auctionHouseImplAddr}`);
    console.log(`AuctionHouse Proxy Admin - ${auctionHouseProxyAdminAddr}`);
    console.log(`AuctionHouse Proxy Admin Owner - ${auctionHouseProxyAdminOwner}`);

    console.log('\n');
    console.log(`CollabToken - ${collabTokenAddr}`);

    console.groupEnd();
    console.log('-'.repeat(process.stdout.columns));
});
