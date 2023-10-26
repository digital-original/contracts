import { ethers, network } from 'hardhat';
import { deployUpgrade } from '../scripts/deploy-upgrade';
import { _verify } from './_verify';
import { ChainConfig } from '../typedefs';

// TODO: create hardhat task

const chainConfig = <ChainConfig><any>network.config;

const IMPL_NAME: string = 'Market';
const IMPL_CONSTRUCTOR_ARGS: string[] = [
    chainConfig.contracts.token,
    chainConfig.wallets.marketSigner.public,
];
const IMPL_PATH: string = `${IMPL_NAME}.sol:${IMPL_NAME}`;
const PROXY_ADMIN_ADDRESS: string = '0xeE2c6e0A0A02113b7a062FEC249d4e966b4eCb37';
const PROXY_ADDRESS: string = '0x4D9ab65975497a978F1686743C688479E87691A7';

async function main(
    implName: string,
    implConstructorArgs: any[],
    implPath: string,
    proxyAdminAddress: string,
    proxyAddress: string
) {
    const [deployer] = await ethers.getSigners();

    console.log(`\n`);
    console.log(`Deploying ${implName} Contract Upgrade ...`);
    console.log(`Environment Mode - ${process.env.ENV_MODE}`);
    console.log(`Proxy Address - ${proxyAddress}`);
    console.log(`Proxy Admin Address - ${proxyAdminAddress}`);
    console.log(`Impl Contractor Arguments - ${JSON.stringify(implConstructorArgs)}`);

    const { impl, upgradeTransactionResponse } = await deployUpgrade({
        implName,
        implConstructorArgs,
        proxyAdminAddress,
        proxyAddress,
        deployer,
    });

    const implAddress = await impl.getAddress();

    console.log(`\n`);
    console.log(`${implName} Contract Upgrade Deployed`);
    console.log(`Impl Contract Address - ${implAddress}`);
    console.log(`Upgrade transaction hash - ${upgradeTransactionResponse.hash}`);

    await _verify(impl, implPath, implAddress, implConstructorArgs);
}

main(IMPL_NAME, IMPL_CONSTRUCTOR_ARGS, IMPL_PATH, PROXY_ADMIN_ADDRESS, PROXY_ADDRESS).catch(
    (error) => {
        console.error(error);
        process.exitCode = 1;
    }
);
