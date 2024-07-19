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
    const { ethers } = await import('hardhat');

    const implName = params.implName;
    const implConstructorArgs = params.implConstructorArgs;

    const { contract: impl, contractAddr: implAddr } = await deployClassic(
        {
            name: implName,
            constructorArgs: implConstructorArgs,
        },
        deployer,
    );

    const proxyAdminAddr = params.proxyAdminAddr;
    const proxyAdminOwner = params.proxyAdminOwner;
    const proxyAdmin = await ethers.getContractAt('ProxyAdmin', proxyAdminAddr, proxyAdminOwner);

    const proxyAddr = params.proxyAddr;
    const response = await proxyAdmin.upgradeAndCall(proxyAddr, impl, new Uint8Array(0));
    const receipt = (await response.wait())!;

    return {
        receipt,
        implAddr,
    };
}
