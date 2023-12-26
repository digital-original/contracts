import { ethers, network } from 'hardhat';
import { deployUpgradeable } from '../scripts/deploy-upgradeable';
import { _verify } from './_verify';
import { AddressParam, ChainConfig } from '../types/environment';

// TODO: create hardhat task

const chainConfig = <ChainConfig>(<any>network.config);

const IMPL_NAME: string = '';
const IMPL_CONSTRUCTOR_ARGS: string[] = [];
const IMPL_PATH: string = `${IMPL_NAME}.sol:${IMPL_NAME}`;
const PROXY_ADMIN_OWNER_ADDRESS: string = '';

// TODO: add logic for new approach of upgradeable contract and proxy admin for each proxy

async function main(
    implName: string,
    implConstructorArgs: string[],
    implPath: string,
    proxyAdminOwnerAddr: AddressParam,
) {
    console.log(`\n`);
    console.log(`Deploying ${implName} Upgradeable Contract...`);
    console.log(`Environment Mode - ${process.env.ENV_MODE}`);
    console.log(`Impl Constructor Arguments - ${JSON.stringify(implConstructorArgs)}`);
    console.log(`Proxy Admin Address - ${proxyAdminOwnerAddr}`);

    const [deployer] = await ethers.getSigners();

    const { impl, proxy, proxyConstructorArgs } = await deployUpgradeable(
        {
            implName,
            implConstructorArgs,
            proxyAdminOwnerAddr,
        },
        deployer,
    );

    const [implAddress, proxyAddress] = await Promise.all([impl.getAddress(), proxy.getAddress()]);

    console.log('\n');
    console.log(`${implName} Upgradeable Contract Deployed`);
    console.log(`Impl Address - ${implAddress}`);
    console.log(`Proxy Address - ${proxyAddress}`);

    await _verify(impl, implPath, implAddress, implConstructorArgs);
    await _verify(
        proxy,
        'TransparentUpgradeableProxy.sol:TransparentUpgradeableProxy',
        proxyAddress,
        proxyConstructorArgs,
    );
}

main(IMPL_NAME, IMPL_CONSTRUCTOR_ARGS, IMPL_PATH, PROXY_ADMIN_OWNER_ADDRESS).catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
