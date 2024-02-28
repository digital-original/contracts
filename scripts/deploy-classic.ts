import { ContractConstructorArgs, Signer } from '../types/environment';

interface Params {
    name: string;
    constructorArgs: ContractConstructorArgs;
}

export async function deployClassic(params: Params, deployer?: Signer) {
    const { ethers } = await import('hardhat');

    const { name, constructorArgs } = params;

    const contract = await ethers.deployContract(name, constructorArgs, deployer);

    return contract.waitForDeployment();
}
