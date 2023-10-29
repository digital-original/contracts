import { ethers } from 'hardhat';
import { Signer, Addressable } from 'ethers';
import { deployClassic } from './deploy-classic';

interface Options {
    implName: string;
    implConstructorArgs?: (string | Uint8Array | Addressable)[];
    proxyAdminAddress: string | Addressable;
    proxyAddress: string | Addressable;
    deployer?: Signer;
}

export async function deployUpgrade(options: Options) {
    const { implName, implConstructorArgs, proxyAdminAddress, proxyAddress, deployer } = options;

    const impl = await deployClassic({
        name: implName,
        constructorArgs: implConstructorArgs,
        deployer,
    });

    const implAddress = await impl.getAddress();

    const proxyAdmin = await ethers.getContractAt('ProxyAdmin', proxyAdminAddress, deployer);

    const upgradeTransactionResponse = await proxyAdmin.upgradeAndCall(
        proxyAddress,
        implAddress,
        new Uint8Array(0),
    );

    const upgradeTransactionReceipt = await upgradeTransactionResponse.wait(1);

    return {
        impl,
        upgradeTransactionResponse,
        upgradeTransactionReceipt,
    };
}
