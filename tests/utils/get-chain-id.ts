import { ethers } from 'hardhat';

export async function getChainId() {
    return Number((await ethers.provider.getNetwork()).chainId);
}
