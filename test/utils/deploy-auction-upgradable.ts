import { ethers } from 'hardhat';
import { deployUpgradeable } from '../../scripts/deploy-upgradable';
import { AddressParam } from '../../types/environment';

export async function deployAuctionUpgradeable(token: AddressParam, marketSigner: AddressParam) {
    const { proxy: deployedContract } = await deployUpgradeable({
        implName: 'Auction',
        implConstructorArgs: [token, marketSigner],
        proxyAdminOwner: '0x0000000000000000000000000000000000000001',
    });

    return Promise.all([
        ethers.getContractAt('Auction', deployedContract),
        deployedContract.getAddress(),
    ]);
}
