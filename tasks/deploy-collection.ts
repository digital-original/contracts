import { task } from 'hardhat/config';
import { ProtocolConfig } from '../types/environment';
import { deployCollection } from '../scripts/deploy-collection';
import { hoursToSeconds } from './utils/hours-to-seconds';
import { etherToWeiForErc20 } from './utils/ether-to-wei-for-erc20';

/*
npx hardhat deploy-collection --network fork
*/

task('deploy-collection').setAction(async (taskArgs: Record<string, string>, hardhat) => {
    const chain = hardhat.network;
    const chainId = chain.config.chainId;
    const config = <ProtocolConfig>(<any>chain.config).protocolConfig;

    if (!chainId) throw new Error(`Chain ID is not defined`);

    console.log('-'.repeat(process.stdout.columns));
    console.group('Conditions:');
    console.log(`Chain - ${chain.name}`);
    console.log(`Chain ID - ${chainId}`);
    console.log(`Collection - ${config.collection.name}`);
    console.groupEnd();
    console.log('-'.repeat(process.stdout.columns));

    const { usdc, main } = config;
    const { name, symbol, minPriceUsd, minFeeUsd, regulated, minAuctionDurationHours } =
        config.collection;

    const minPrice = await etherToWeiForErc20(usdc, minPriceUsd);
    const minFee = await etherToWeiForErc20(usdc, minFeeUsd);
    const minAuctionDuration = hoursToSeconds(minAuctionDurationHours);

    console.log(`Deploying collection...`);
    console.log(`\n`);
    console.group('Params:');
    console.log(`name: ${name}`);
    console.log(`symbol: ${symbol}`);
    console.log(`usdc: ${usdc}`);
    console.log(`main: ${main}`);
    console.log(`minPriceUsd: ${minPriceUsd}`);
    console.log(`minPrice: ${minPrice}`);
    console.log(`minFeeUsd: ${minFeeUsd}`);
    console.log(`minFee: ${minFee}`);
    console.log(`regulated: ${regulated}`);
    console.log(`minAuctionDurationHours: ${minAuctionDurationHours}`);
    console.log(`minAuctionDuration: ${minAuctionDuration}`);
    console.groupEnd();
    console.log(`\n`);
    console.log(`Transaction broadcasting...`);

    const {
        receipt,

        artTokenAddr,
        artTokenImplAddr,
        artTokenProxyAdminAddr,
        artTokenProxyAdminOwnerAddr,

        auctionHouseAddr,
        auctionHouseImplAddr,
        auctionHouseProxyAdminAddr,
        auctionHouseProxyAdminOwnerAddr,
    } = await deployCollection({
        usdc,
        main,
        name,
        symbol,
        minPrice,
        minFee,
        regulated,
        minAuctionDuration,
    });

    console.log(`Transaction broadcasted`);
    console.log(`Transaction hash - ${receipt.hash}`);
    console.log('-'.repeat(process.stdout.columns));

    console.group('Result:');
    console.log(`ArtToken Proxy - ${artTokenAddr}`);
    console.log(`ArtToken Impl - ${artTokenImplAddr}`);
    console.log(`ArtToken Proxy Admin - ${artTokenProxyAdminAddr}`);
    console.log(`ArtToken Proxy Admin Owner - ${artTokenProxyAdminOwnerAddr}`);

    console.log('\n');
    console.log(`AuctionHouse Proxy - ${auctionHouseAddr}`);
    console.log(`AuctionHouse Impl - ${auctionHouseImplAddr}`);
    console.log(`AuctionHouse Proxy Admin - ${auctionHouseProxyAdminAddr}`);
    console.log(`AuctionHouse Proxy Admin Owner - ${auctionHouseProxyAdminOwnerAddr}`);

    console.groupEnd();
    console.log('-'.repeat(process.stdout.columns));
});
