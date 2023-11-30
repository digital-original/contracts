export type AuctionPermitStruct = {
    tokenId: bigint;
    seller: string;
    price: bigint;
    priceStep: bigint;
    endTime: number;
    participants: string[];
    shares: bigint[];
    deadline: number;
};
