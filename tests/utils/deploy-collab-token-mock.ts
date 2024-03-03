import { ethers } from 'hardhat';
import { deployClassic } from '../../scripts/deploy-classic';

export async function deployCollabTokenMock() {
    const deployedContract = await deployClassic({
        name: 'CollabTokenMock',
        constructorArgs: [],
    });

    return Promise.all([
        ethers.getContractAt('CollabTokenMock', deployedContract),
        deployedContract.getAddress(),
    ]);
}
