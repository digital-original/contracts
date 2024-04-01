export type BuyPermitStruct = {
    tokenId: number;
    tokenURI: string;
    price: bigint;
    fee: bigint;
    participants: string[];
    shares: bigint[];
    deadline: number;
};
