export const ART_TOKEN_NAME = 'Digital Original';
export const ART_TOKEN_SYMBOL = 'DO';

export const ART_TOKEN_DOMAIN_NAME = 'ArtToken';
export const ART_TOKEN_DOMAIN_VERSION = '1';

export const MINT_AND_PAY_PERMIT_TYPE = {
    MintAndPayPermit: [
        { name: 'to', type: 'address' },
        { name: 'tokenId', type: 'uint256' },
        { name: 'tokenURI', type: 'string' },
        { name: 'price', type: 'uint256' },
        { name: 'participants', type: 'address[]' },
        { name: 'shares', type: 'uint256[]' },
        { name: 'deadline', type: 'uint256' },
    ],
};
