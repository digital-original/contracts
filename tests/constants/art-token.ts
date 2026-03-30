import { id } from 'ethers';
import { TokenConfig } from '../../typechain-types/contracts/art-token/ArtToken';
import { ONE_HUNDRED } from './general';
import { REGULATION_MODE_REGULATED } from './token-config';

export const ART_TOKEN_DOMAIN_NAME = 'ArtToken';
export const ART_TOKEN_DOMAIN_VERSION = '1';

export const TOKEN_MINTING_PERMIT_TYPE = {
    TokenMintingPermit: [
        { name: 'tokenId', type: 'uint256' },
        { name: 'minter', type: 'address' },
        { name: 'currency', type: 'address' },
        { name: 'price', type: 'uint256' },
        { name: 'fee', type: 'uint256' },
        { name: 'tokenURI', type: 'string' },
        { name: 'tokenConfig', type: 'bytes32' },
        { name: 'participants', type: 'address[]' },
        { name: 'rewards', type: 'uint256[]' },
        { name: 'deadline', type: 'uint256' },
    ],
};

export const TOKEN_ID = +id('TOKEN_ID').slice(0, 10);
export const NON_EXISTENT_TOKEN_ID = +id('NON_EXISTENT_TOKEN_ID').slice(0, 10);
export const TOKEN_URI = 'ipfs://QmbQ9c4KN5FcGreai5rjTRUs1N2FFMaY819JGZZMGDcSLQ';
export const SECOND_TOKEN_URI = 'ipfs://QmbqKeWzBDUwKzVye3RxeD67N7rQrfgTaPTevucfbP3BST';

export const TOKEN_PRICE = 1_000_000_000n;
export const TOKEN_FEE = 100_000_000n;
export const TOKEN_ROYALTY_PERCENT = ONE_HUNDRED / 20n; // 5%

export const TOKEN_CREATOR_ADDR = '0x1000000000000000000000000000000000000000';
export const TOKEN_REGULATION_MODE = REGULATION_MODE_REGULATED;

export const TOKEN_CONFIG: TokenConfig.TypeStruct = {
    creator: TOKEN_CREATOR_ADDR,
    regulationMode: TOKEN_REGULATION_MODE,
};
