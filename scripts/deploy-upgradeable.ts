import { deployClassic } from './deploy-classic';
import { AddressParam, ContractConstructorArgs, Signer } from '../types/environment';

interface Params {
    implName: string;
    implConstructorArgs: ContractConstructorArgs;
    proxyAdminOwnerAddr: AddressParam;
    initialize?: boolean;
}

export async function deployUpgradeable(params: Params, deployer?: Signer) {
    const implName = params.implName;
    const implConstructorArgs = params.implConstructorArgs;

    const { contract: impl, contractAddr: implAddr } = await deployClassic(
        {
            name: implName,
            constructorArgs: implConstructorArgs,
        },
        deployer,
    );

    const proxyName = `TransparentUpgradeableProxy`;
    const proxyAdminOwner = params.proxyAdminOwnerAddr;
    const initializationData = params.initialize
        ? impl.interface.encodeFunctionData('initialize')
        : new Uint8Array(0);
    const proxyConstructorArgs: ContractConstructorArgs = [
        impl,
        proxyAdminOwner,
        initializationData,
    ];

    const {
        receipt,
        contract: proxy,
        contractAddr: proxyAddr,
    } = await deployClassic(
        {
            name: proxyName,
            constructorArgs: proxyConstructorArgs,
        },
        deployer,
    );

    return {
        receipt,
        proxy,
        proxyAddr,
        implAddr,
    };
}
