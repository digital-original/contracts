import { ethers } from 'hardhat';
import { deployClassic } from '../../scripts/deploy-classic';

export async function deployMarketMock() {
    const deployedContract = await deployClassic({
        name: 'MarketMock',
        constructorArgs: [],
    });

    return Promise.all([
        ethers.getContractAt('MarketMock', deployedContract),
        deployedContract.getAddress(),
    ]);
}
