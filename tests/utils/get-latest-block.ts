import { ethers } from 'hardhat';

export async function getLatestBlock() {
    const block = await ethers.provider.getBlock('latest');

    return block!;
}
