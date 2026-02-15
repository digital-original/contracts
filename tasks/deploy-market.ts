import { task } from 'hardhat/config';
import { ProtocolConfig } from '../types/environment';
import { deployMarket } from '../scripts/deploy-market';

/*
npx hardhat deploy-market --network fork
*/

task('deploy-market').setAction(async (taskArgs: Record<string, string>, hardhat) => {
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

    const { main, wrappedEther } = config;

    console.log(`Deploying Market...`);
    console.log(`\n`);
    console.group('Params:');
    console.log(`main: ${main}`);
    console.log(`wrappedEther: ${wrappedEther}`);
    console.groupEnd();
    console.log(`\n`);
    console.log(`Transaction broadcasting...`);

    const { receipt, marketAddr, marketProxyAdminAddr, marketProxyAdminOwnerAddr, marketImplAddr } =
        await deployMarket({ main, wrappedEther });

    console.log(`Transaction broadcasted`);
    console.log(`Transaction hash - ${receipt.hash}`);
    console.log('-'.repeat(process.stdout.columns));

    console.group('Result:');
    console.log(`Market Proxy - ${marketAddr}`);
    console.log(`Market Impl - ${marketImplAddr}`);
    console.log(`Market Proxy Admin - ${marketProxyAdminAddr}`);
    console.log(`Market Proxy Admin Owner - ${marketProxyAdminOwnerAddr}`);

    console.groupEnd();
    console.log('-'.repeat(process.stdout.columns));
});
