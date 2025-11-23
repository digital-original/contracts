import { TypedDataEncoder } from 'ethers';
import { TOKEN_CONFIG_TYPE } from '../constants/token-config';
import { TokenConfig } from '../../typechain-types/contracts/art-token/ArtToken';

export class TokenConfigUtils {
    static hash(tokenConfig: TokenConfig.TypeStruct) {
        return TypedDataEncoder.from(TOKEN_CONFIG_TYPE).hash(tokenConfig);
    }
}
