import { ethers } from 'hardhat';
import { deployUpgradeable } from '../../scripts/deploy-upgradeable';
import { AddressParam } from '../../types/environment';

export async function deployTokenUpgradeable(
    minter: AddressParam,
    market: AddressParam,
    auction: AddressParam,
) {
    const { proxy: deployedContract } = await deployUpgradeable({
        implName: 'Token',
        implConstructorArgs: [minter, market, auction],
        proxyAdminOwnerAddr: '0x0000000000000000000000000000000000000001',
    });

    return Promise.all([
        ethers.getContractAt('Token', deployedContract),
        deployedContract.getAddress(),
    ]);
}
