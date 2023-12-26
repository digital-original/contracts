import { ethers } from 'hardhat';
import { _verify } from './_verify';

// TODO: create hardhat task

const NAME: string = '';
const PATH: string = `${NAME}.sol:${NAME}`;
const ADDRESS: string = '';
const CONSTRUCTOR_ARGS: string[] = [];

async function main(name: string, path: string, address: string, constructorArgs: any[]) {
    const contract = await ethers.getContractAt(name, address);

    await _verify(contract, path, address, constructorArgs);
}

main(NAME, PATH, ADDRESS, CONSTRUCTOR_ARGS).catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
