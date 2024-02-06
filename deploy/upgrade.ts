import { ethers, network } from 'hardhat';
import { deployUpgrade } from '../scripts/deploy-upgrade';
import { _verify } from './_verify';
import { ChainConfig } from '../types/environment';

// TODO: create hardhat task

const chainConfig = <ChainConfig>(<any>network.config);

const IMPL_NAME: string = '';
const IMPL_CONSTRUCTOR_ARGS: string[] = [];
const IMPL_PATH: string = `${IMPL_NAME}.sol:${IMPL_NAME}`;
const PROXY_ADDRESS: string = '';
const PROXY_ADMIN_ADDRESS: string = '';
const PROXY_ADMIN_OWNER_PRIVATE_KEY: string = '';

async function main(
    implName: string,
    implConstructorArgs: any[],
    implPath: string,
    proxyAddr: string,
    proxyAdminAddr: string,
    proxyAdminOwnerPrivateKey: string,
) {
    console.log(`\n`);
    console.log(`Deploying ${implName} Contract Upgrade ...`);
    console.log(`Environment - ${process.env.ENV_MODE}`);
    console.log(`Proxy Address - ${proxyAddr}`);
    console.log(`Proxy Admin Address - ${proxyAdminAddr}`);
    console.log(`Impl Contractor Arguments - ${JSON.stringify(implConstructorArgs)}`);

    const [deployer] = await ethers.getSigners();
    const proxyAdminOwner = new ethers.Wallet(proxyAdminOwnerPrivateKey);

    const { impl, response } = await deployUpgrade(
        {
            implName,
            implConstructorArgs,
            proxyAdminAddr,
            proxyAddr,
            proxyAdminOwner,
        },
        deployer,
    );

    const implAddress = await impl.getAddress();

    console.log(`\n`);
    console.log(`${implName} Contract Upgrade Deployed`);
    console.log(`Impl Contract Address - ${implAddress}`);
    console.log(`Upgrade transaction hash - ${response.hash}`);

    await _verify(impl, implPath, implAddress, implConstructorArgs);
}

main(
    IMPL_NAME,
    IMPL_CONSTRUCTOR_ARGS,
    IMPL_PATH,
    PROXY_ADDRESS,
    PROXY_ADMIN_ADDRESS,
    PROXY_ADMIN_OWNER_PRIVATE_KEY,
).catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
