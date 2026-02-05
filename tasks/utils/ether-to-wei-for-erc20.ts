import { AddressLike, Numeric, resolveAddress } from 'ethers';

export async function etherToWeiForErc20(address: AddressLike, ether: Numeric): Promise<Numeric> {
    const { ethers } = await import('hardhat');

    const resolvedAddress = await resolveAddress(address);
    const contract = await ethers.getContractAt('ERC20', resolvedAddress);
    const decimals = await contract.decimals();

    const wei = BigInt(ether) * 10n ** BigInt(decimals);

    return wei;
}
