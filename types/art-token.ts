export type BuyPermitStruct = {
    tokenId: number;
    tokenURI: string;
    price: bigint;
    participants: string[];
    shares: bigint[];
    deadline: number;
};

export type CollabPermitStruct = {
    tokenId: bigint;
    tokenURI: string;
    guarantee: bigint;
    deadline: number;
    data: string;
};
