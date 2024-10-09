import { task } from 'hardhat/config';
import { ChainConfig } from '../types/environment';
import { deployClassic } from '../scripts/deploy-classic';

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
    console.log(`Environment Mode - ${process.env.ENV_MODE}`);
    console.groupEnd();
    console.log('-'.repeat(process.stdout.columns));

    const mainAddr = config.wallets!.main.public;
    const auctionHouseAddr = config.contracts!.auctionHouse.proxy;
    const usdcAddr = config.usdc!;

    console.log(`Deploying ArtToken Impl...`);
    console.log(`\n`);
    console.group('Params:');
    console.log(`main: ${mainAddr}`);
    console.log(`auctionHouse: ${auctionHouseAddr}`);
    console.log(`usdc: ${usdcAddr}`);
    console.groupEnd();
    console.log(`\n`);
    console.log(`Transaction broadcasting...`);

    const { receipt, contractAddr: artTokenImplAddr } = await deployClassic({
        name: 'ArtToken',
        constructorArgs: [mainAddr, auctionHouseAddr, usdcAddr],
    });

    console.log(`Transaction broadcasted`);
    console.log(`Transaction hash - ${receipt.hash}`);
    console.log('-'.repeat(process.stdout.columns));

    console.group('Result:');
    console.log(`ArtToken Impl - ${artTokenImplAddr}`);
    console.groupEnd();
    console.log('-'.repeat(process.stdout.columns));
});
