import { task } from 'hardhat/config';
import { ProtocolConfig } from '../types/environment';
import { hoursToSeconds } from './utils/hours-to-seconds';

/*
npx hardhat verify-auction-house --network fork
*/

task('verify-auction-house').setAction(async (taskArgs: Record<string, string>, hardhat) => {
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
    const { proxy, impl, admin } = config.collection.auctionHouse;
    const artToken = config.collection.artToken.proxy;
    const minAuctionDuration = hoursToSeconds(config.collection.minAuctionDurationHours);
    const proxyAdmin = admin;
    const proxyAdminOwner = main;

    console.log(`Verify AuctionHouse...`);
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

    console.group(`AuctionHouse Impl:`);
    console.log(`address: ${impl}`);
    console.log(`proxy: ${proxy}`);
    console.log(`main: ${main}`);
    console.log(`wrappedEther: ${wrappedEther}`);
    console.log(`artToken: ${artToken}`);
    console.log(`minAuctionDuration: ${minAuctionDuration}`);
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
        contract: 'contracts/auction-house/AuctionHouse.sol:AuctionHouse',
        address: impl,
        constructorArguments: [proxy, main, wrappedEther, artToken, minAuctionDuration],
    });
    console.log('-'.repeat(process.stdout.columns));
});
