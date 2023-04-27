import { FormatTypes } from 'ethers/lib/utils';
import { ethers } from 'hardhat';
import { deployClassic } from './deploy-classic';

interface Options {
    contractName: string;
    proxyAdminAddress: string;
    constructorArgs: any[];
    initializeArgs: any[];
    signer?: any;
}

export async function deployUpgradeable(options: Options) {
    const { contractName, constructorArgs, initializeArgs, signer, proxyAdminAddress } = options;

    const implName = contractName;
    const implAgs = constructorArgs;

    const impl = await deployClassic({
        contractName: implName,
        constructorArgs: implAgs,
        signer,
    });

    const proxyName = `${implName}TransparentUpgradeableProxy`;
    const proxyArgs = [impl.address, proxyAdminAddress, []];

    const proxy = await deployClassic({
        contractName: proxyName,
        constructorArgs: proxyArgs,
        signer,
    });

    const proxyWithImpl = await ethers.getContractAt(
        [...proxy.interface.format(FormatTypes.full), ...impl.interface.format(FormatTypes.full)],
        proxy.address,
        signer
    );

    const initializeTx = await proxyWithImpl.initialize(...initializeArgs);

    return {
        impl,
        proxy,
        proxyWithImpl,
        initializeTx,
        initializeArgs,
        implName,
        proxyName,
        proxyArgs,
    };
}
