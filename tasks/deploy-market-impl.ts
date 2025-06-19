import { task } from 'hardhat/config';
import { ChainConfig } from '../types/environment';
import { deploy } from '../scripts/deploy';

/*
npx hardhat deploy-market-impl--network fork
*/

task('deploy-market-impl').setAction(async (taskArgs: Record<string, string>, hardhat) => {
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

    const proxyAddr = config.market.proxy;
    const mainAddr = config.main;
    const artTokenAddr = config.artToken.proxy;
    const usdcAddr = config.usdc;

    console.log(`Deploying ArtToken Impl...`);
    console.log(`\n`);
    console.group('Params:');
    console.log(`proxy: ${proxyAddr}`);
    console.log(`main: ${mainAddr}`);
    console.log(`artToken: ${artTokenAddr}`);
    console.log(`usdc: ${usdcAddr}`);
    console.groupEnd();
    console.log(`\n`);
    console.log(`Transaction broadcasting...`);

    const { receipt, contractAddr: marketImplAddr } = await deploy({
        name: 'Market',
        constructorArgs: [proxyAddr, mainAddr, artTokenAddr, usdcAddr],
    });

    console.log(`Transaction broadcasted`);
    console.log(`Transaction hash - ${receipt.hash}`);
    console.log('-'.repeat(process.stdout.columns));

    console.group('Result:');
    console.log(`Market Impl - ${marketImplAddr}`);
    console.groupEnd();
    console.log('-'.repeat(process.stdout.columns));
});
