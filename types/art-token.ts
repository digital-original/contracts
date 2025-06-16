import { AddressLike, Numeric } from 'ethers';

export type BuyPermitStruct = {
    tokenId: Numeric;
    tokenURI: string;
    sender: AddressLike;
    price: Numeric;
    fee: Numeric;
    participants: AddressLike[];
    shares: Numeric[];
    deadline: Numeric;
};
