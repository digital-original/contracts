import { ethers, network } from 'hardhat';
import { deployUpgrade } from '../scripts/deploy-upgrade';
import { _verify } from './_verify';
import { ChainConfig } from '../types/environment';

// TODO: create hardhat task

const chainConfig = <ChainConfig><any>network.config;

const IMPL_NAME: string = 'Auction';
const IMPL_CONSTRUCTOR_ARGS: string[] = [
    chainConfig.contracts.token.proxy,
    chainConfig.wallets.marketSigner.public,
];
const IMPL_PATH: string = `${IMPL_NAME}.sol:${IMPL_NAME}`;
const PROXY_ADMIN_ADDRESS: string = chainConfig.contracts.auction.admin;
const PROXY_ADDRESS: string = chainConfig.contracts.auction.proxy;

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

    const { impl, response } = await deployUpgrade({
        implName,
        implConstructorArgs,
        proxyAdminAddress,
        proxyAddress,
    }, deployer);

    const implAddress = await impl.getAddress();

    console.log(`\n`);
    console.log(`${implName} Contract Upgrade Deployed`);
    console.log(`Impl Contract Address - ${implAddress}`);
    console.log(`The upgrade transaction hash - ${response.hash}`);

    // await _verify(impl, implPath, implAddress, implConstructorArgs);
}

main(IMPL_NAME, IMPL_CONSTRUCTOR_ARGS, IMPL_PATH, PROXY_ADMIN_ADDRESS, PROXY_ADDRESS).catch(
    (error) => {
        console.error(error);
        process.exitCode = 1;
    }
);

// const IMPL_NAME: string = 'Token';
// const IMPL_CONSTRUCTOR_ARGS: string[] = [
//     chainConfig.wallets.minter.public,
//     chainConfig.contracts.market.proxy,
//     chainConfig.contracts.auction.proxy,
// ];
// const IMPL_PATH: string = `${IMPL_NAME}.sol:${IMPL_NAME}`;
// const PROXY_ADMIN_ADDRESS: string = chainConfig.contracts.token.admin;
// const PROXY_ADDRESS: string = chainConfig.contracts.token.proxy;

// const IMPL_NAME: string = 'Market';
// const IMPL_CONSTRUCTOR_ARGS: string[] = [
//     chainConfig.contracts.token.proxy,
//     chainConfig.wallets.marketSigner.public,
// ];
// const IMPL_PATH: string = `${IMPL_NAME}.sol:${IMPL_NAME}`;
// const PROXY_ADMIN_ADDRESS: string = chainConfig.contracts.market.admin;
// const PROXY_ADDRESS: string = chainConfig.contracts.market.proxy;
