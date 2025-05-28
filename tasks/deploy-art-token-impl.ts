import { task } from 'hardhat/config';
import { ChainConfig } from '../types/environment';
import { deployClassic } from '../scripts/deploy-classic';
import { USDC_DECIMALS } from '../constants/usdc';

/*
npx hardhat deploy-art-token-impl --network fork
*/

task('deploy-art-token-impl').setAction(async (taskArgs: Record<string, string>, hardhat) => {
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

    const { usdc, main, minPriceUsd, minFeeUsd, regulated, auctionHouse } = config;

    const minPrice = minPriceUsd * 10 ** USDC_DECIMALS;
    const minFee = minFeeUsd * 10 ** USDC_DECIMALS;

    console.log(`Deploying ArtToken Impl...`);
    console.log(`\n`);
    console.group('Params:');
    console.log(`main: ${main}`);
    console.log(`auctionHouse: ${auctionHouse.proxy}`);
    console.log(`usdc: ${usdc}`);
    console.log(`minPrice: ${minPrice}`);
    console.log(`minFee: ${minFee}`);
    console.log(`regulated: ${regulated}`);
    console.groupEnd();
    console.log(`\n`);
    console.log(`Transaction broadcasting...`);

    const { receipt, contractAddr: artTokenImplAddr } = await deployClassic({
        name: 'ArtToken',
        constructorArgs: [main, auctionHouse.proxy, usdc, minPrice, minFee, regulated],
    });

    console.log(`Transaction broadcasted`);
    console.log(`Transaction hash - ${receipt.hash}`);
    console.log('-'.repeat(process.stdout.columns));

    console.group('Result:');
    console.log(`ArtToken Impl - ${artTokenImplAddr}`);
    console.groupEnd();
    console.log('-'.repeat(process.stdout.columns));
});
