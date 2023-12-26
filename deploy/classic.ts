import { ethers, network } from 'hardhat';
import { deployClassic } from '../scripts/deploy-classic';
import { _verify } from './_verify';
import { ChainConfig } from '../types/environment';

// TODO: create hardhat task

const chainConfig = <ChainConfig>(<any>network.config);

const NAME: string = '';
const CONSTRUCTOR_ARGS: string[] = [];
const PATH: string = `${NAME}.sol:${NAME}`;

async function main(name: string, constructorArgs: any[], path: string) {
    console.log(`\n`);
    console.log(`Deploying ${name} Contract...`);
    console.log(`Environment Mode - ${process.env.ENV_MODE}`);
    console.log(`Constructor Arguments - ${JSON.stringify(constructorArgs)}`);

    const [deployer] = await ethers.getSigners();

    const contract = await deployClassic({ name, constructorArgs }, deployer);
    const contractAddress = await contract.getAddress();

    console.log('\n');
    console.log(`${name} Contract Deployed`);
    console.log(`Contract Address - ${contractAddress}`);

    await _verify(contract, path, contractAddress, constructorArgs);
}

main(NAME, CONSTRUCTOR_ARGS, PATH).catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
