export type AuctionPermitStruct = {
    tokenId: bigint;
    seller: string;
    price: bigint;
    step: bigint;
    penalty: bigint;
    startTime: number;
    endTime: number;
    deadline: number;
    participants: string[];
    shares: bigint[];
};

export type AuctionRaisePermitStruct = {
    auctionId: bigint;
    price: bigint;
    fee: bigint;
    deadline: number;
};
