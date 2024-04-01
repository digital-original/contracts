import { ethers } from 'hardhat';
import { deployUpgradeable } from '../../scripts/deploy-upgradeable';
import { AddressParam } from '../../types/environment';

export async function deployAuctionHouseUpgradeable(
    token: AddressParam,
    platform: AddressParam,
    auctionSigner: AddressParam,
) {
    const { proxy: deployedContract } = await deployUpgradeable({
        implName: 'AuctionHouse',
        implConstructorArgs: [token, platform, auctionSigner],
        proxyAdminOwnerAddr: '0x0000000000000000000000000000000000000001',
    });

    return Promise.all([
        ethers.getContractAt('AuctionHouse', deployedContract),
        deployedContract.getAddress(),
    ]);
}
