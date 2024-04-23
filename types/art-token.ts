export type BuyPermitStruct = {
    tokenId: bigint;
    tokenURI: string;
    price: bigint;
    fee: bigint;
    participants: string[];
    shares: bigint[];
    deadline: number;
};
