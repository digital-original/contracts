import { ethers } from 'hardhat';
import { Signer, Addressable } from 'ethers';

interface Options {
    name: string;
    constructorArgs?: (string | Uint8Array | Addressable)[];
    deployer?: Signer;
}

export async function deployClassic(options: Options) {
    const { name, constructorArgs = [], deployer } = options;

    const contract = await ethers.deployContract(name, constructorArgs, deployer);

    await contract.waitForDeployment();

    return contract;
}
