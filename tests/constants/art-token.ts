import { ZeroAddress } from 'ethers';
import { TokenConfig } from '../../typechain-types/contracts/art-token/ArtToken';

export const ART_TOKEN_DOMAIN_NAME = 'ArtToken';
export const ART_TOKEN_DOMAIN_VERSION = '1';

export const TOKEN_MINTING_PERMIT_TYPE = {
    TokenMintingPermit: [
        { name: 'tokenId', type: 'uint256' },
        { name: 'minter', type: 'address' },
        { name: 'price', type: 'uint256' },
        { name: 'fee', type: 'uint256' },
        { name: 'tokenURI', type: 'string' },
        { name: 'tokenConfig', type: 'bytes32' },
        { name: 'participants', type: 'address[]' },
        { name: 'rewards', type: 'uint256[]' },
        { name: 'deadline', type: 'uint256' },
    ],
};

export const TOKEN_CONFIG_TYPE = {
    TokenConfig: [
        { name: 'creator', type: 'address' },
        { name: 'regulationMode', type: 'uint8' },
    ],
};

export const TOKEN_ID = 1;
export const TOKEN_URI = 'ipfs://QmbQ9c4KN5FcGreai5rjTRUs1N2FFMaY819JGZZMGDcSLQ';

export const TOKEN_CONFIG: TokenConfig.TypeStruct = {
    creator: ZeroAddress,
    regulationMode: 0,
} as const;
