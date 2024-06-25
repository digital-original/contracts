export type BuyPermitStruct = {
    tokenId: bigint;
    tokenURI: string;
    sender: string;
    price: bigint;
    fee: bigint;
    participants: string[];
    shares: bigint[];
    deadline: number;
};
