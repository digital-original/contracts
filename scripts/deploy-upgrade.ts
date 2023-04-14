import { FormatTypes } from 'ethers/lib/utils';
import { ethers } from 'hardhat';
import { deployClassic } from './deploy-classic';

const PROXY_ADMIN_NAME = 'DOProxyAdmin';

interface Options {
    contractName: string;
    proxyAddress: string;
    proxyAdminAddress: string;
    constructorArgs: any[];
    signer?: any;
}

export async function deployUpgrade(options: Options) {
    const { contractName, proxyAddress, proxyAdminAddress, constructorArgs, signer } = options;

    const implName = contractName;

    const impl = await deployClassic({
        contractName: implName,
        constructorArgs,
        signer,
    });

    const proxyAdmin = await ethers.getContractAt(PROXY_ADMIN_NAME, proxyAdminAddress, signer);

    const upgradeTx = await proxyAdmin.upgrade(proxyAddress, impl.address);

    const proxyName = `${implName}TransparentUpgradeableProxy`;
    const Proxy = await ethers.getContractFactory(proxyName);
    const proxyWithImpl = await ethers.getContractAt(
        [...Proxy.interface.format(FormatTypes.full), ...impl.interface.format(FormatTypes.full)],
        proxyAddress,
        signer
    );

    return {
        implName,
        impl,
        proxyName,
        proxyWithImpl,
        upgradeTx,
    };
}
