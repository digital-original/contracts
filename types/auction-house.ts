export type AuctionPermitStruct = {
    tokenId: bigint;
    seller: string;
    asset: string;
    price: bigint;
    step: bigint;
    penalty: bigint;
    startTime: number;
    endTime: number;
    deadline: number;
    participants: string[];
    shares: bigint[];
};
