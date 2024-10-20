import { task } from 'hardhat/config';
import { ChainConfig } from '../types/environment';

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
    console.log(`Environment Mode - ${process.env.ENV_MODE}`);
    console.groupEnd();
    console.log('-'.repeat(process.stdout.columns));

    // TransparentUpgradeableProxy
    const proxyAddr = config.artToken.proxy;
    const implAddr = config.artToken.impl;
    const proxyAdminOwnerAddr = config.main;

    // ProxyAdmin
    const proxyAdminAddr = config.artToken.admin;

    // ArtToken
    const mainAddr = config.main;
    const auctionHouseAddr = config.auctionHouse.proxy;
    const usdcAddr = config.usdc;

    console.log(`Verify ArtToken...`);
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
    console.log(`auctionHouse: ${auctionHouseAddr}`);
    console.log(`usdc: ${usdcAddr}`);
    console.groupEnd();

    console.groupEnd();
    console.log(`\n`);

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
        contract: 'contracts/art-token/ArtToken.sol:ArtToken',
        address: implAddr,
        constructorArguments: [mainAddr, auctionHouseAddr, usdcAddr],
    });
    console.log('-'.repeat(process.stdout.columns));
});
