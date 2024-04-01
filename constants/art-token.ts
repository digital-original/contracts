export const ART_TOKEN_NAME = 'Digital Original';
export const ART_TOKEN_SYMBOL = 'DO';

export const ART_TOKEN_DOMAIN_NAME = 'ArtToken';
export const ART_TOKEN_DOMAIN_VERSION = '1';

export const BUY_PERMIT_TYPE = {
    BuyPermit: [
        { name: 'tokenId', type: 'uint256' },
        { name: 'tokenURI', type: 'string' },
        { name: 'price', type: 'uint256' },
        { name: 'participants', type: 'address[]' },
        { name: 'shares', type: 'uint256[]' },
        { name: 'deadline', type: 'uint256' },
    ],
};

export const COLLAB_PERMIT_TYPE = {
    CollabPermit: [
        { name: 'tokenId', type: 'uint256' },
        { name: 'tokenURI', type: 'string' },
        { name: 'guarantee', type: 'uint256' },
        { name: 'asset', type: 'address' },
        { name: 'deadline', type: 'uint256' },
        { name: 'data', type: 'bytes' },
    ],
};
