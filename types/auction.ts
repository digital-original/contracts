export type AuctionPermitStruct = {
    seller: string;
    tokenId: number;
    price: bigint;
    priceStep: bigint;
    endTime: number;
    participants: string[];
    shares: bigint[];
    deadline: number;
};
