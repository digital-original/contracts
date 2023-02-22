import { ethers } from 'hardhat';

interface Options {
    contractName: string;
    constructorArgs: any[];
    signer?: any;
}

export async function deployClassic(options: Options) {
    const { contractName, constructorArgs, signer } = options;

    const Contract = await ethers.getContractFactory(contractName, signer);
    const contract = await Contract.deploy(...constructorArgs);

    await contract.deployed();

    return contract;
}
