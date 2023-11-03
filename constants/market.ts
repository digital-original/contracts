export const MARKET_DOMAIN_NAME = 'Market';
export const MARKET_DOMAIN_VERSION = '1';

export const MARKET_PERMIT_TYPE = {
    MarketPermit: [
        { name: 'seller', type: 'address' },
        { name: 'tokenId', type: 'uint256' },
        { name: 'price', type: 'uint256' },
        { name: 'participants', type: 'address[]' },
        { name: 'shares', type: 'uint256[]' },
        { name: 'deadline', type: 'uint256' },
    ],
};
