export const AUCTION_HOUSE_DOMAIN_NAME = 'AuctionHouse';
export const AUCTION_HOUSE_DOMAIN_VERSION = '1';

export const AUCTION_PERMIT_TYPE = {
    AuctionPermit: [
        { name: 'tokenId', type: 'uint256' },
        { name: 'seller', type: 'address' },
        { name: 'asset', type: 'address' },
        { name: 'price', type: 'uint256' },
        { name: 'step', type: 'uint256' },
        { name: 'startTime', type: 'uint256' },
        { name: 'endTime', type: 'uint256' },
        { name: 'deadline', type: 'uint256' },
        { name: 'participants', type: 'address[]' },
        { name: 'shares', type: 'uint256[]' },
    ],
};
