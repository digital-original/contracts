import { AbiCoder } from 'ethers';

export function encodeMarketPlaceParams(
    price: bigint,
    deadline: number,
    participants: string[],
    shares: bigint[],
    signature: string,
) {
    return AbiCoder.defaultAbiCoder().encode(
        ['uint256', 'uint256', 'address[]', 'uint256[]', 'bytes'],
        [price, deadline, participants, shares, signature],
    );
}
