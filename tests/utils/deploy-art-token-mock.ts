import { ethers } from 'hardhat';
import { deployClassic } from '../../scripts/deploy-classic';

export async function deployArtTokenMock() {
    const deployedContract = await deployClassic({
        name: 'ArtTokenMock',
        constructorArgs: [],
    });

    return Promise.all([
        ethers.getContractAt('ArtTokenMock', deployedContract),
        deployedContract.getAddress(),
    ]);
}
