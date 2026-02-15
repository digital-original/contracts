import { task } from 'hardhat/config';
import { ProtocolConfig } from '../types/environment';
import { deploy } from '../scripts/deploy';
import { hoursToSeconds } from './utils/hours-to-seconds';

/*
npx hardhat deploy-auction-house-impl --network fork
*/

task('deploy-auction-house-impl').setAction(async (taskArgs: Record<string, string>, hardhat) => {
    const chain = hardhat.network;
    const chainId = chain.config.chainId;
    const config = <ProtocolConfig>(<any>chain.config).protocolConfig;

    if (!chainId) throw new Error(`Chain ID is not defined`);

    console.log('-'.repeat(process.stdout.columns));
    console.group('Conditions:');
    console.log(`Chain - ${chain.name}`);
    console.log(`Chain ID - ${chainId}`);
    console.groupEnd();
    console.log('-'.repeat(process.stdout.columns));

    const { main, wrappedEther } = config;
    const { minAuctionDurationHours, artToken, auctionHouse } = config.collection;

    const minAuctionDuration = hoursToSeconds(minAuctionDurationHours);

    console.log(`Deploying AuctionHouse Impl...`);
    console.log(`\n`);
    console.group('Params:');
    console.log(`proxy: ${auctionHouse.proxy}`);
    console.log(`main: ${main}`);
    console.log(`wrappedEther: ${wrappedEther}`);
    console.log(`artToken: ${artToken.proxy}`);
    console.log(`minAuctionDuration: ${minAuctionDuration}`);
    console.groupEnd();
    console.log(`\n`);
    console.log(`Transaction broadcasting...`);

    const { receipt, contractAddr: auctionHouseImplAddr } = await deploy({
        name: 'AuctionHouse',
        constructorArgs: [
            auctionHouse.proxy,
            main,
            wrappedEther,
            artToken.proxy,
            minAuctionDuration,
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
