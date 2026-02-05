import { task } from 'hardhat/config';
import { ProtocolConfig } from '../types/environment';
import { deploy } from '../scripts/deploy';

/*
npx hardhat deploy-art-token-impl --network fork
*/

task('deploy-art-token-impl').setAction(async (taskArgs: Record<string, string>, hardhat) => {
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

    const { main } = config;
    const { artToken, auctionHouse } = config.collection;

    console.log(`Deploying ArtToken Impl...`);
    console.log(`\n`);
    console.group('Params:');
    console.log(`main: ${main}`);
    console.log(`artToken: ${artToken.proxy}`);
    console.log(`auctionHouse: ${auctionHouse.proxy}`);
    console.groupEnd();
    console.log(`\n`);
    console.log(`Transaction broadcasting...`);

    const { receipt, contractAddr: artTokenImplAddr } = await deploy({
        name: 'ArtToken',
        constructorArgs: [artToken.proxy, main, auctionHouse.proxy],
    });

    console.log(`Transaction broadcasted`);
    console.log(`Transaction hash - ${receipt.hash}`);
    console.log('-'.repeat(process.stdout.columns));

    console.group('Result:');
    console.log(`ArtToken Impl - ${artTokenImplAddr}`);
    console.groupEnd();
    console.log('-'.repeat(process.stdout.columns));
});
