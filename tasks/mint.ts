import { task } from 'hardhat/config';
import { ChainConfig } from '../types/environment';

task('mint').setAction(async () => {
    const { ethers, network } = await import('hardhat');

    const chainConfig = <ChainConfig>(<any>network.config);

    const minter = new ethers.Wallet(chainConfig.wallets.minter.private, ethers.provider);

    const token = await ethers.getContractAt('Token', chainConfig.contracts.token.proxy, minter);

    await token.safeMint(chainConfig.wallets.minter.public, 1, 'uri', new Uint8Array(0));
});
