import { ethers, network } from 'hardhat';
import { deployUpgradeable } from '../scripts/deploy-upgradable';
import { _verify } from './_verify';
import { ChainConfig } from '../types/environment';

// TODO: create hardhat task

const chainConfig = <ChainConfig>(<any>network.config);

const IMPL_NAME: string = 'Market';
const IMPL_CONSTRUCTOR_ARGS: string[] = [
    chainConfig.contracts.token,
    chainConfig.wallets.marketSigner.public,
];
const IMPL_PATH: string = `${IMPL_NAME}.sol:${IMPL_NAME}`;
const PROXY_ADMIN_OWNER: string = chainConfig.wallets.deployer.public;

async function main(
    implName: string,
    implConstructorArgs: string[],
    implPath: string,
    proxyAdminOwner: string,
) {
    const [deployer] = await ethers.getSigners();

    console.log(`\n`);
    console.log(`Deploying ${implName} Upgradeable Contract...`);
    console.log(`Environment Mode - ${process.env.ENV_MODE}`);
    console.log(`Proxy Admin Owner - ${proxyAdminOwner}`);
    console.log(`Impl Constructor Arguments - ${JSON.stringify(implConstructorArgs)}`);

    const { impl, proxy, proxyAdmin, proxyConstructorArgs, proxyAdminConstructorArgs } =
        await deployUpgradeable({
            implName,
            implConstructorArgs,
            proxyAdminOwner,
            deployer,
        });

    const implAddress = await impl.getAddress();
    const proxyAddress = await proxy.getAddress();
    const proxyAdminAddress = await proxyAdmin.getAddress();

    console.log('\n');
    console.log(`${implName} Upgradeable Contract Deployed`);
    console.log(`Impl Address - ${implAddress}`);
    console.log(`Proxy Address - ${proxyAddress}`);
    console.log(`Proxy Admin Address - ${proxyAdminAddress}`);
    console.log(`Proxy Constructor Arguments - ${JSON.stringify(proxyConstructorArgs)}`);

    await _verify(impl, implPath, implAddress, implConstructorArgs);
    await _verify(
        proxy,
        'TransparentUpgradeableProxy.sol:TransparentUpgradeableProxy',
        proxyAddress,
        proxyConstructorArgs,
    );
    await _verify(
        proxyAdmin,
        'ProxyAdmin.sol:ProxyAdmin',
        proxyAdminAddress,
        proxyAdminConstructorArgs,
    );
}

main(IMPL_NAME, IMPL_CONSTRUCTOR_ARGS, IMPL_PATH, PROXY_ADMIN_OWNER).catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
