import { ethers } from 'hardhat';
import { deployClassic } from '../../scripts/deploy-classic';

export async function deployAuctionHouseMock() {
    const deployedContract = await deployClassic({
        name: 'AuctionHouseMock',
        constructorArgs: [],
    });

    return Promise.all([
        ethers.getContractAt('AuctionHouseMock', deployedContract),
        deployedContract.getAddress(),
    ]);
}
