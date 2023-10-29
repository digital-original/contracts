import { ethers } from 'hardhat';
import type { Signer, Addressable, EventLog } from 'ethers';
import { deployClassic } from './deploy-classic';

interface Options {
    implName: string;
    implConstructorArgs?: (string | Uint8Array | Addressable)[];
    proxyAdminOwner: string | Addressable;
    deployer?: Signer;
}

export async function deployUpgradeable(options: Options) {
    const { implName, implConstructorArgs, proxyAdminOwner, deployer } = options;

    const impl = await deployClassic({
        name: implName,
        constructorArgs: implConstructorArgs,
        deployer,
    });

    const implAddress = await impl.getAddress();

    const proxyName = `TransparentUpgradeableProxy`;
    const proxyConstructorArgs = [implAddress, proxyAdminOwner, new Uint8Array(0)];

    const proxy = await deployClassic({
        name: proxyName,
        constructorArgs: proxyConstructorArgs,
        deployer,
    });

    const proxyDeploymentTransactionReceipt = await proxy.deploymentTransaction()?.wait(1);
    const adminChangedEvent = <EventLog>proxyDeploymentTransactionReceipt?.logs[2];
    const proxyAdminAddress = <string>adminChangedEvent.args.newAdmin;

    const proxyAdmin = await ethers.getContractAt('ProxyAdmin' as string, proxyAdminAddress);
    const proxyAdminConstructorArgs = [proxyAdminOwner];

    return {
        impl,
        proxy,
        proxyAdmin,
        implConstructorArgs,
        proxyConstructorArgs,
        proxyAdminConstructorArgs,
    };
}
