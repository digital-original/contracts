import { task } from 'hardhat/config';
import { ChainConfig } from '../types/environment';
import { deploy } from '../scripts/deploy';
import { etherToWeiForErc20 } from './utils/ether-to-wei-for-erc20';
import { hoursToSeconds } from './utils/hours-to-seconds';

/*
npx hardhat deploy-auction-house-impl --network fork
*/

task('deploy-auction-house-impl').setAction(async (taskArgs: Record<string, string>, hardhat) => {
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

    const { usdc, main, minPriceUsd, minFeeUsd, minAuctionDurationHours, artToken, auctionHouse } =
        config;

    const minPrice = await etherToWeiForErc20(usdc, minPriceUsd);
    const minFee = await etherToWeiForErc20(usdc, minFeeUsd);
    const minAuctionDuration = hoursToSeconds(minAuctionDurationHours);

    console.log(`Deploying AuctionHouse Impl...`);
    console.log(`\n`);
    console.group('Params:');
    console.log(`main: ${main}`);
    console.log(`artToken: ${artToken.proxy}`);
    console.log(`auctionHouse: ${auctionHouse.proxy}`);
    console.log(`usdc: ${usdc}`);
    console.log(`minPriceUsd: ${minPriceUsd}`);
    console.log(`minPrice: ${minPrice}`);
    console.log(`minFeeUsd: ${minFeeUsd}`);
    console.log(`minFee: ${minFee}`);
    console.log(`minAuctionDurationHours: ${minAuctionDurationHours}`);
    console.log(`minAuctionDuration: ${minAuctionDuration}`);
    console.groupEnd();
    console.log(`\n`);
    console.log(`Transaction broadcasting...`);

    const { receipt, contractAddr: auctionHouseImplAddr } = await deploy({
        name: 'AuctionHouse',
        constructorArgs: [
            auctionHouse.proxy,
            main,
            artToken.proxy,
            usdc,
            minAuctionDuration,
            minPrice,
            minFee,
        ],
    });

    console.log(`Transaction broadcasted`);
    console.log(`Transaction hash - ${receipt.hash}`);
    console.log('-'.repeat(process.stdout.columns));

    console.group('Result:');
    console.log(`AuctionHouse Impl - ${auctionHouseImplAddr}`);
    console.groupEnd();
    console.log('-'.repeat(process.stdout.columns));
});
