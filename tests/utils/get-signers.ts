import { ethers } from 'hardhat';
import { Signer } from 'ethers';

export async function getSigners(): Promise<readonly [signers: Signer[], addresses: string[]]> {
    const [deployer, signer1, signer2, signer3, signer4, signer5, signer6, signer7, signer8] =
        await ethers.getSigners();

    const [
        signer1Addr,
        signer2Addr,
        signer3Addr,
        signer4Addr,
        signer5Addr,
        signer6Addr,
        signer7Addr,
        signer8Addr,
    ] = await Promise.all([
        signer1.getAddress(),
        signer2.getAddress(),
        signer3.getAddress(),
        signer4.getAddress(),
        signer5.getAddress(),
        signer6.getAddress(),
        signer7.getAddress(),
        signer8.getAddress(),
    ]);

    return [
        [signer1, signer2, signer3, signer4, signer5, signer6, signer7, signer8],
        [
            signer1Addr,
            signer2Addr,
            signer3Addr,
            signer4Addr,
            signer5Addr,
            signer6Addr,
            signer7Addr,
            signer8Addr,
        ],
    ];
}
