export const AUCTION_HOUSE_DOMAIN_NAME = 'AuctionHouse';
export const AUCTION_HOUSE_DOMAIN_VERSION = '1';

export const AUCTION_CREATION_PERMIT_TYPE = {
    AuctionCreationPermit: [
        { name: 'auctionId', type: 'uint256' },
        { name: 'tokenId', type: 'uint256' },
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

export const AUCTION_ID = 1;
export const SECOND_AUCTION_ID = 2;
export const AUCTION_STEP = 1_000_000n;
export const MIN_AUCTION_DURATION = 1800;
