import { ethers } from 'hardhat';
import { deployClassic } from '../../scripts/deploy-classic';

export async function deployUsdc() {
    const deployedContract = await deployClassic({
        name: 'USDC',
        constructorArgs: [],
    });

    return Promise.all([
        ethers.getContractAt('USDC', deployedContract),
        deployedContract.getAddress(),
    ]);
}
