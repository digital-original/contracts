import { id } from 'ethers';

export const AUCTION_HOUSE_DOMAIN_NAME = 'AuctionHouse';
export const AUCTION_HOUSE_DOMAIN_VERSION = '1';

export const AUCTION_CREATION_PERMIT_TYPE = {
    AuctionCreationPermit: [
        { name: 'auctionId', type: 'uint256' },
        { name: 'tokenId', type: 'uint256' },
        { name: 'currency', type: 'address' },
        { name: 'price', type: 'uint256' },
        { name: 'fee', type: 'uint256' },
        { name: 'step', type: 'uint256' },
        { name: 'endTime', type: 'uint256' },
        { name: 'tokenURI', type: 'string' },
        { name: 'tokenConfig', type: 'bytes32' },
        { name: 'participants', type: 'address[]' },
        { name: 'shares', type: 'uint256[]' },
        { name: 'deadline', type: 'uint256' },
    ],
};

export const MIN_AUCTION_DURATION = 1800;

export const AUCTION_ID = +id('AUCTION_ID').slice(0, 10);
export const NON_EXISTENT_AUCTION_ID = +id('NON_EXISTENT_AUCTION_ID').slice(0, 10);
export const SECOND_AUCTION_ID = +id('SECOND_AUCTION_ID').slice(0, 10);

export const AUCTION_STEP = 1_000_000n;
export const AUCTION_PRICE = 1_000_000_000n;
export const AUCTION_FEE = 100_000_000n;
