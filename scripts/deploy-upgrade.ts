import { ethers } from 'hardhat';
import { deployClassic } from './deploy-classic';
import { AddressParam, ContractConstructorArgs, Signer } from '../types/environment';

interface Params {
    implName: string;
    implConstructorArgs: ContractConstructorArgs;
    proxyAdminAddr: AddressParam;
    proxyAddr: AddressParam;
    proxyAdminOwner: Signer;
}

export async function deployUpgrade(params: Params, deployer?: Signer) {
    const implName = params.implName;
    const implConstructorArgs = params.implConstructorArgs;

    const impl = await deployClassic(
        {
            name: implName,
            constructorArgs: implConstructorArgs,
        },
        deployer,
    );

    const proxyAdminAddress = params.proxyAdminAddr;
    const proxyAdminOwner = params.proxyAdminOwner;
    const proxyAdmin = await ethers.getContractAt('ProxyAdmin', proxyAdminAddress, proxyAdminOwner);

    const proxyAddress = params.proxyAddr;
    const response = await proxyAdmin.upgradeAndCall(proxyAddress, impl, new Uint8Array(0));
    const receipt = await response.wait();

    return {
        impl,
        response,
        receipt,
    };
}
