import { ethers } from 'hardhat';
import { deployUpgradeable } from '../../scripts/deploy-upgradeable';
import { AddressParam } from '../../types/environment';

export async function deployArtTokenUpgradeable(
    minter: AddressParam,
    market: AddressParam,
    auction: AddressParam,
    collabToken: AddressParam,
) {
    const { proxy: deployedContract } = await deployUpgradeable({
        implName: 'ArtToken',
        implConstructorArgs: [minter, market, auction, collabToken],
        proxyAdminOwnerAddr: '0x0000000000000000000000000000000000000001',
        initialize: true,
    });

    return Promise.all([
        ethers.getContractAt('ArtToken', deployedContract),
        deployedContract.getAddress(),
    ]);
}
