import { task } from 'hardhat/config';
import { ChainConfig } from '../types/environment';
import { deployClassic } from '../scripts/deploy-classic';
import { USDC_DECIMALS } from '../constants/usdc';

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
    console.groupEnd();
    console.log('-'.repeat(process.stdout.columns));

    const { usdc, main, minPriceUsd, minFeeUsd, minAuctionDurationHours, artToken } = config;

    const minPrice = minPriceUsd * 10 ** USDC_DECIMALS;
    const minFee = minFeeUsd * 10 ** USDC_DECIMALS;
    const minAuctionDuration = minAuctionDurationHours * 60 * 60;

    console.log(`Deploying AuctionHouse Impl...`);
    console.log(`\n`);
    console.group('Params:');
    console.log(`main: ${main}`);
    console.log(`artToken: ${artToken.proxy}`);
    console.log(`usdc: ${usdc}`);
    console.log(`minPrice: ${minPrice}`);
    console.log(`minFee: ${minFee}`);
    console.log(`minAuctionDuration: ${minAuctionDuration}`);
    console.groupEnd();
    console.log(`\n`);
    console.log(`Transaction broadcasting...`);

    const { receipt, contractAddr: auctionHouseImplAddr } = await deployClassic({
        name: 'AuctionHouse',
        constructorArgs: [main, artToken.proxy, usdc, minAuctionDuration, minPrice, minFee],
    });

    console.log(`Transaction broadcasted`);
    console.log(`Transaction hash - ${receipt.hash}`);
    console.log('-'.repeat(process.stdout.columns));

    console.group('Result:');
    console.log(`AuctionHouse Impl - ${auctionHouseImplAddr}`);
    console.groupEnd();
    console.log('-'.repeat(process.stdout.columns));
});
