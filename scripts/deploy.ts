import { Signer } from 'ethers';

interface Params {
    name: string;
    constructorArgs: any[];
}

export async function deploy(params: Params, deployer?: Signer) {
    const { ethers } = await import('hardhat');

    const { name, constructorArgs } = params;

    const contract = await ethers.deployContract(name, constructorArgs, deployer);

    const [_receipt, contractAddr] = await Promise.all([
        contract.deploymentTransaction()?.wait(),
        contract.getAddress(),
    ]);

    const receipt = _receipt!;

    return {
        receipt,
        contract,
        contractAddr,
    };
}
