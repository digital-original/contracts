export const AUCTION_DOMAIN_NAME = 'Auction';
export const AUCTION_DOMAIN_VERSION = '1';

export const AUCTION_PERMIT_TYPE = {
    AuctionPermit: [
        { name: 'seller', type: 'address' },
        { name: 'tokenId', type: 'uint256' },
        { name: 'price', type: 'uint256' },
        { name: 'priceStep', type: 'uint256' },
        { name: 'endTime', type: 'uint256' },
        { name: 'participants', type: 'address[]' },
        { name: 'shares', type: 'uint256[]' },
        { name: 'deadline', type: 'uint256' },
    ],
};
