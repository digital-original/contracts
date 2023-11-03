import { deployClassic } from './deploy-classic';
import { AddressParam, ContractConstructorArgs, Signer } from '../types/environment';

interface Params {
    implName: string;
    implConstructorArgs?: ContractConstructorArgs;
    proxyAdminOwner: AddressParam;
}

export async function deployUpgradeable(params: Params, deployer?: Signer) {
    const implName = params.implName;
    const implConstructorArgs = params.implConstructorArgs;

    const impl = await deployClassic(
        {
            name: implName,
            constructorArgs: implConstructorArgs,
        },
        deployer,
    );

    const proxyName = `TransparentUpgradeableProxy`;
    const proxyAdminOwner = params.proxyAdminOwner;
    const proxyConstructorArgs: ContractConstructorArgs = [impl, proxyAdminOwner, new Uint8Array(0)];

    const proxy = await deployClassic(
        {
            name: proxyName,
            constructorArgs: proxyConstructorArgs,
        },
        deployer,
    );

    return { impl, proxy };
}
