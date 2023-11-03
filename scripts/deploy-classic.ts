import { ethers } from 'hardhat';
import { ContractConstructorArgs, Signer } from '../types/environment';

interface Params {
    name: string;
    constructorArgs?: ContractConstructorArgs;
}

export async function deployClassic(params: Params, deployer?: Signer) {
    const { name, constructorArgs = [] } = params;

    const contract = await ethers.deployContract(name, constructorArgs, deployer);

    return contract.waitForDeployment();
}
