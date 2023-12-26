import { ethers } from 'hardhat';
import { Contract } from 'ethers';
import { AdminChangedEvent } from '../../typechain-types/@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol/TransparentUpgradeableProxy';

export async function getProxyAdmin(proxy: Contract) {
    const receipt = await proxy.deploymentTransaction()?.wait();

    if (!receipt) {
        throw new Error('Deployment transaction receipt error');
    }

    const TransparentUpgradeableProxy = await ethers.getContractFactory(
        'TransparentUpgradeableProxy',
    );

    const adminChangedEvent = <AdminChangedEvent.LogDescription>(
        (<unknown>TransparentUpgradeableProxy.interface.parseLog(<any>receipt.logs[2])!)
    );

    const proxyAdminAddress = adminChangedEvent.args.newAdmin;

    return Promise.all([ethers.getContractAt('ProxyAdmin', proxyAdminAddress), proxyAdminAddress]);
}
