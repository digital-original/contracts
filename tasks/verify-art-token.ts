import { task } from 'hardhat/config';
import { ProtocolConfig } from '../types/environment';

/*
npx hardhat verify-art-token --network fork
*/

task('verify-art-token').setAction(async (taskArgs: Record<string, string>, hardhat) => {
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

    const { main, wrappedEther } = config;
    const { proxy, impl, admin } = config.collection.artToken;
    const auctionHouse = config.collection.auctionHouse.proxy;
    const proxyAdmin = admin;
    const proxyAdminOwner = main;

    console.log(`Verify ArtToken...`);
    console.log(`\n`);
    console.group('Params:');

    console.group(`TransparentUpgradeableProxy:`);
    console.log(`address: ${proxy}`);
    console.log(`impl: ${impl}`);
    console.log(`proxyAdminOwner: ${proxyAdminOwner}`);
    console.groupEnd();

    console.group(`ProxyAdmin:`);
    console.log(`address: ${proxyAdmin}`);
    console.log(`proxyAdminOwner: ${proxyAdminOwner}`);
    console.groupEnd();

    console.group(`ArtToken Impl:`);
    console.log(`address: ${impl}`);
    console.log(`proxy: ${proxy}`);
    console.log(`main: ${main}`);
    console.log(`wrappedEther: ${wrappedEther}`);
    console.log(`auctionHouse: ${auctionHouse}`);
    console.groupEnd();

    console.groupEnd();
    console.log(`\n`);

    await hardhat.run('verify:verify', {
        contract:
            '@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol:TransparentUpgradeableProxy',
        address: proxy,
        constructorArguments: [impl, proxyAdminOwner, new Uint8Array(0)],
    });
    console.log(`\n`);

    await hardhat.run('verify:verify', {
        contract: '@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol:ProxyAdmin',
        address: proxyAdmin,
        constructorArguments: [proxyAdminOwner],
    });
    console.log(`\n`);

    await hardhat.run('verify:verify', {
        contract: 'contracts/art-token/ArtToken.sol:ArtToken',
        address: impl,
        constructorArguments: [proxy, main, wrappedEther, auctionHouse],
    });
    console.log('-'.repeat(process.stdout.columns));
});
