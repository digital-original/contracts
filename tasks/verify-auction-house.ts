import { task } from 'hardhat/config';
import { ChainConfig } from '../types/environment';
import { deployClassic } from '../scripts/deploy-classic';

/*
npx hardhat verify-auction-house --network fork
*/

task('verify-auction-house').setAction(async (taskArgs: Record<string, string>, hardhat) => {
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

    // TransparentUpgradeableProxy
    const proxyAddr = config.auctionHouse.proxy;
    const implAddr = config.auctionHouse.impl;
    const proxyAdminOwnerAddr = config.main;

    // ProxyAdmin
    const proxyAdminAddr = config.auctionHouse.admin;

    // AuctionHouse
    const mainAddr = config.main;
    const artTokenAddr = config.artToken.proxy;
    const usdcAddr = config.usdc;
    const minAuctionDurationHours = config.minAuctionDurationHours;

    console.log(`Verify AuctionHouse...`);
    console.log(`\n`);
    console.group('Params:');

    console.group(`TransparentUpgradeableProxy:`);
    console.log(`proxy: ${proxyAddr}`);
    console.log(`impl: ${implAddr}`);
    console.log(`proxyAdminOwner: ${proxyAdminOwnerAddr}`);
    console.groupEnd();

    console.group(`ProxyAdmin:`);
    console.log(`proxyAdmin: ${proxyAdminAddr}`);
    console.log(`proxyAdminOwner: ${proxyAdminOwnerAddr}`);
    console.groupEnd();

    console.group(`ArtToken:`);
    console.log(`main: ${mainAddr}`);
    console.log(`artToken: ${artTokenAddr}`);
    console.log(`usdc: ${usdcAddr}`);
    console.log(`minAuctionDurationHours: ${minAuctionDurationHours}`);
    console.groupEnd();

    console.groupEnd();
    console.log(`\n`);

    const minAuctionDurationSeconds = minAuctionDurationHours * 60 * 60;

    await hardhat.run('verify:verify', {
        contract:
            '@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol:TransparentUpgradeableProxy',
        address: proxyAddr,
        constructorArguments: [implAddr, proxyAdminOwnerAddr, new Uint8Array(0)],
    });
    console.log(`\n`);

    await hardhat.run('verify:verify', {
        contract: '@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol:ProxyAdmin',
        address: proxyAdminAddr,
        constructorArguments: [proxyAdminOwnerAddr],
    });
    console.log(`\n`);

    await hardhat.run('verify:verify', {
        contract: 'contracts/auction-house/AuctionHouse.sol:AuctionHouse',
        address: implAddr,
        constructorArguments: [mainAddr, artTokenAddr, usdcAddr, minAuctionDurationSeconds],
    });
    console.log('-'.repeat(process.stdout.columns));
});
