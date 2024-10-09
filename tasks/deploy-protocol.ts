import { task } from 'hardhat/config';
import { ChainConfig } from '../types/environment';
import { deployProtocol } from '../scripts/deploy-protocol';

/*
npx hardhat deploy-protocol --network fork
*/

task('deploy-protocol').setAction(async (taskArgs: Record<string, string>, hardhat) => {
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

    const mainAddr = config.wallets!.main.public;
    const usdcAddr = config.usdc!;
    const minAuctionDurationHours = config.minAuctionDurationHours!;

    console.log(`Deploying protocol...`);
    console.log(`\n`);
    console.group('Params:');
    console.log(`main: ${mainAddr}`);
    console.log(`usdc: ${usdcAddr}`);
    console.log(`minAuctionDurationHours: ${minAuctionDurationHours}`);
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
    } = await deployProtocol({
        main: mainAddr,
        usdc: usdcAddr,
        minAuctionDurationHours: minAuctionDurationHours,
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

    console.groupEnd();
    console.log('-'.repeat(process.stdout.columns));
});
