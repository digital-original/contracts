import { ethers, network } from 'hardhat';
import { _verify } from './_verify';
import { ChainConfig } from '../typedefs';

// TODO: create hardhat task

const chainConfig = <ChainConfig><any>network.config;

const NAME: string = 'Token';
const PATH: string = `${NAME}.sol:${NAME}`;
const ADDRESS: string = '0xE35F7BAFEa9F60DDE0b0D152FaeD72562278A3B6';
const CONSTRUCTOR_ARGS: string[] = [
    chainConfig.wallets.minter.public,
    chainConfig.contracts.transferChecker,
    chainConfig.wallets.deployer.public,
];

async function main(name: string, path: string, address: string, constructorArgs: any[]) {
    const contract = await ethers.getContractAt(name, address);

    await _verify(contract, path, address, constructorArgs);
}

main(NAME, PATH, ADDRESS, CONSTRUCTOR_ARGS).catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
