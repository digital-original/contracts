import { task } from 'hardhat/config';
import { ChainConfig } from '../types/environment';
import { USDC_DECIMALS } from '../constants/usdc';

/*
npx hardhat verify-art-token --network fork
*/

task('verify-art-token').setAction(async (taskArgs: Record<string, string>, hardhat) => {
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
    const proxy = config.artToken.proxy;
    const impl = config.artToken.impl;
    const proxyAdminOwner = config.main;

    // ProxyAdmin
    const proxyAdmin = config.artToken.admin;

    // ArtToken
    const main = config.main;
    const auctionHouse = config.auctionHouse.proxy;
    const usdc = config.usdc;
    const minPrice = config.minPriceUsd * 10 ** USDC_DECIMALS;
    const minFee = config.minFeeUsd * 10 ** USDC_DECIMALS;
    const regulated = config.regulated;

    console.log(`Verify ArtToken...`);
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
    console.log(`auctionHouse: ${auctionHouse}`);
    console.log(`usdc: ${usdc}`);
    console.log(`minPrice: ${minPrice}`);
    console.log(`minFee: ${minFee}`);
    console.log(`regulated: ${regulated}`);
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
        constructorArguments: [main, auctionHouse, usdc, minPrice, minFee, regulated],
    });
    console.log('-'.repeat(process.stdout.columns));
});
