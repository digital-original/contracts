export type MintAndPayPermitStruct = {
    to: string;
    tokenId: number;
    tokenURI: string;
    price: bigint;
    participants: string[];
    shares: bigint[];
    deadline: number;
};
