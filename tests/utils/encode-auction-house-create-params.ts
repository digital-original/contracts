import { AbiCoder } from 'ethers';

export function encodeAuctionHouseCreateParams(
    tokenId: bigint,
    seller: string,
    asset: string,
    price: bigint,
    step: bigint,
    penalty: bigint,
    startTime: number,
    endTime: number,
    deadline: number,
    participants: string[],
    shares: bigint[],
    signature: string,
) {
    return AbiCoder.defaultAbiCoder().encode(
        [
            'uint256',
            'address',
            'address',
            'uint256',
            'uint256',
            'uint256',
            'uint256',
            'uint256',
            'uint256',
            'address[]',
            'uint256[]',
            'bytes',
        ],
        [
            tokenId,
            seller,
            asset,
            price,
            step,
            penalty,
            startTime,
            endTime,
            deadline,
            participants,
            shares,
            signature,
        ],
    );
}
