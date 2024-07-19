import { ethers } from 'hardhat';
import { deployClassic } from '../../scripts/deploy-classic';

export async function deployUsdc() {
    const { contractAddr } = await deployClassic({
        name: 'USDC',
        constructorArgs: [],
    });

    const contract = await ethers.getContractAt('USDC', contractAddr);

    return [contract, contractAddr] as const;
}
