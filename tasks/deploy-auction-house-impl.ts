import { task } from 'hardhat/config';
import { ChainConfig } from '../types/environment';
import { deployClassic } from '../scripts/deploy-classic';

/*
npx hardhat deploy-auction-house-impl --network fork
*/

task('deploy-auction-house-impl').setAction(async (taskArgs: Record<string, string>, hardhat) => {
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

    const mainAddr = config.main;
    const artTokenAddr = config.artToken.proxy;
    const usdcAddr = config.usdc;
    const minAuctionDurationHours = config.minAuctionDurationHours;

    console.log(`Deploying AuctionHouse Impl...`);
    console.log(`\n`);
    console.group('Params:');
    console.log(`main: ${mainAddr}`);
    console.log(`artToken: ${artTokenAddr}`);
    console.log(`usdc: ${usdcAddr}`);
    console.log(`minAuctionDurationHours: ${minAuctionDurationHours}`);
    console.groupEnd();
    console.log(`\n`);
    console.log(`Transaction broadcasting...`);

    const minAuctionDurationSeconds = minAuctionDurationHours * 60 * 60;

    const { receipt, contractAddr: auctionHouseImplAddr } = await deployClassic({
        name: 'AuctionHouse',
        constructorArgs: [mainAddr, artTokenAddr, usdcAddr, minAuctionDurationSeconds],
    });

    console.log(`Transaction broadcasted`);
    console.log(`Transaction hash - ${receipt.hash}`);
    console.log('-'.repeat(process.stdout.columns));

    console.group('Result:');
    console.log(`AuctionHouse Impl - ${auctionHouseImplAddr}`);
    console.groupEnd();
    console.log('-'.repeat(process.stdout.columns));
});
