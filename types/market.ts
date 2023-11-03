export type MarketPermitStruct = {
    seller: string;
    tokenId: bigint;
    price: bigint;
    participants: string[];
    shares: bigint[];
    deadline: number;
};
