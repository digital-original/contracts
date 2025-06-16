import { Numeric } from 'ethers';

export type CreatePermitStruct = {
    auctionId: Numeric;
    tokenId: Numeric;
    tokenURI: string;
    price: Numeric;
    fee: Numeric;
    step: Numeric;
    endTime: Numeric;
    participants: string[];
    shares: Numeric[];
    deadline: Numeric;
};
