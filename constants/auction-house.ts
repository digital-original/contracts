export const AUCTION_HOUSE_DOMAIN_NAME = 'AuctionHouse';
export const AUCTION_HOUSE_DOMAIN_VERSION = '1';

export const CREATE_PERMIT_TYPE = {
    CreatePermit: [
        { name: 'auctionId', type: 'uint256' },
        { name: 'tokenId', type: 'uint256' },
        { name: 'tokenURI', type: 'string' },
        { name: 'price', type: 'uint256' },
        { name: 'fee', type: 'uint256' },
        { name: 'step', type: 'uint256' },
        { name: 'endTime', type: 'uint256' },
        { name: 'participants', type: 'address[]' },
        { name: 'shares', type: 'uint256[]' },
        { name: 'deadline', type: 'uint256' },
    ],
};
