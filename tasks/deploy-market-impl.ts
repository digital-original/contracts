import { task } from 'hardhat/config';
import { ProtocolConfig } from '../types/environment';
import { deploy } from '../scripts/deploy';

/*
npx hardhat deploy-market-impl--network fork
*/

task('deploy-market-impl').setAction(async (taskArgs: Record<string, string>, hardhat) => {
    const chain = hardhat.network;
    const chainId = chain.config.chainId;
    const config = <ProtocolConfig>(<any>chain.config).protocolConfig;

    if (!chainId) throw new Error(`Chain ID is not defined`);

    console.log('-'.repeat(process.stdout.columns));
    console.group('Conditions:');
    console.log(`Chain - ${chain.name}`);
    console.log(`Chain ID - ${chainId}`);
    console.log(`Market`);
    console.groupEnd();
    console.log('-'.repeat(process.stdout.columns));

    const proxyAddr = config.market.market.proxy;
    const mainAddr = config.main;

    console.log(`Deploying Market Impl...`);
    console.log(`\n`);
    console.group('Params:');
    console.log(`proxy: ${proxyAddr}`);
    console.log(`main: ${mainAddr}`);
    console.groupEnd();
    console.log(`\n`);
    console.log(`Transaction broadcasting...`);

    const { receipt, contractAddr: marketImplAddr } = await deploy({
        name: 'Market',
        constructorArgs: [proxyAddr, mainAddr],
    });

    console.log(`Transaction broadcasted`);
    console.log(`Transaction hash - ${receipt.hash}`);
    console.log('-'.repeat(process.stdout.columns));

    console.group('Result:');
    console.log(`Market Impl - ${marketImplAddr}`);
    console.groupEnd();
    console.log('-'.repeat(process.stdout.columns));
});
