import { AbiCoder } from 'ethers';

export function encodeAuctionPlaceParams(
    price: bigint,
    priceStep: bigint,
    endTime: number,
    deadline: number,
    participants: string[],
    shares: bigint[],
    signature: string,
) {
    return AbiCoder.defaultAbiCoder().encode(
        ['uint256', 'uint256', 'uint256', 'uint256', 'address[]', 'uint256[]', 'bytes'],
        [price, priceStep, endTime, deadline, participants, shares, signature],
    );
}
