export type AuctionPermitStruct = {
    auctionId: bigint;
    tokenId: bigint;
    tokenURI: string;
    price: bigint;
    fee: bigint;
    step: bigint;
    endTime: number;
    participants: string[];
    shares: bigint[];
    deadline: number;
};
