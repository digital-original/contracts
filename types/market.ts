export type MarketPermitStruct = {
    tokenId: bigint;
    seller: string;
    price: bigint;
    participants: string[];
    shares: bigint[];
    deadline: number;
};
