import { ethers } from 'hardhat';

export async function getLatestBlockTimestamp() {
    const block = await ethers.provider.getBlock('latest');

    return block!.timestamp;
}
