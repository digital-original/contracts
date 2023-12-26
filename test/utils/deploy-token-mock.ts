import { ethers } from 'hardhat';
import { deployClassic } from '../../scripts/deploy-classic';

export async function deployTokenMock() {
    const deployedContract = await deployClassic({
        name: 'TokenMock',
        constructorArgs: [],
    });

    return Promise.all([
        ethers.getContractAt('TokenMock', deployedContract),
        deployedContract.getAddress()
    ]);
}
