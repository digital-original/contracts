import { task } from 'hardhat/config';
import { ChainConfig } from '../types/environment';
import { deployClassic } from '../scripts/deploy-classic';
import { USDC_DECIMALS } from '../constants/usdc';

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
    console.groupEnd();
    console.log('-'.repeat(process.stdout.columns));

    // TransparentUpgradeableProxy
    const proxy = config.auctionHouse.proxy;
    const impl = config.auctionHouse.impl;
    const proxyAdminOwner = config.main;

    // ProxyAdmin
    const proxyAdmin = config.auctionHouse.admin;

    // AuctionHouse
    const main = config.main;
    const artToken = config.artToken.proxy;
    const usdc = config.usdc;
    const minAuctionDuration = config.minAuctionDurationHours * 60 * 60;
    const minPrice = config.minPriceUsd * 10 ** USDC_DECIMALS;
    const minFee = config.minFeeUsd * 10 ** USDC_DECIMALS;

    console.log(`Verify AuctionHouse...`);
    console.log(`\n`);
    console.group('Params:');

    console.group(`TransparentUpgradeableProxy:`);
    console.log(`proxy: ${proxy}`);
    console.log(`impl: ${impl}`);
    console.log(`proxyAdminOwner: ${proxyAdminOwner}`);
    console.groupEnd();

    console.group(`ProxyAdmin:`);
    console.log(`proxyAdmin: ${proxyAdmin}`);
    console.log(`proxyAdminOwner: ${proxyAdminOwner}`);
    console.groupEnd();

    console.group(`ArtToken:`);
    console.log(`main: ${main}`);
    console.log(`artToken: ${artToken}`);
    console.log(`usdc: ${usdc}`);
    console.log(`minAuctionDuration: ${minAuctionDuration}`);
    console.log(`minPrice: ${minPrice}`);
    console.log(`minFee: ${minFee}`);
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
        constructorArguments: [main, artToken, usdc, minAuctionDuration, minPrice, minFee],
    });
    console.log('-'.repeat(process.stdout.columns));
});
