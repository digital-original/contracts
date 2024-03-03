import { ethers } from 'hardhat';
import { AddressParam } from '../../types/environment';
import { deployClassic } from '../../scripts/deploy-classic';

export async function deployCollabToken(artToken: AddressParam, auctionHouse: AddressParam) {
    const deployedContract = await deployClassic({
        name: 'CollabToken',
        constructorArgs: [artToken, auctionHouse],
    });

    return Promise.all([
        ethers.getContractAt('CollabToken', deployedContract),
        deployedContract.getAddress(),
    ]);
}
