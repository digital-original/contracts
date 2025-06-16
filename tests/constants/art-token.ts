export const ART_TOKEN_DOMAIN_NAME = 'ArtToken';
export const ART_TOKEN_DOMAIN_VERSION = '1';

export const BUY_PERMIT_TYPE = {
    BuyPermit: [
        { name: 'tokenId', type: 'uint256' },
        { name: 'tokenURI', type: 'string' },
        { name: 'sender', type: 'address' },
        { name: 'price', type: 'uint256' },
        { name: 'fee', type: 'uint256' },
        { name: 'participants', type: 'address[]' },
        { name: 'shares', type: 'uint256[]' },
        { name: 'deadline', type: 'uint256' },
    ],
};

export const TOKEN_ID = 1;
export const TOKEN_URI = 'ipfs://QmbQ9c4KN5FcGreai5rjTRUs1N2FFMaY819JGZZMGDcSLQ';
export const REGULATED = true;
