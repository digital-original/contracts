import { Signer, TypedDataDomain } from 'ethers';
import {
    ART_TOKEN_DOMAIN_NAME,
    ART_TOKEN_DOMAIN_VERSION,
    TOKEN_MINTING_PERMIT_TYPE,
} from '../constants/art-token';
import { TokenConfigUtils } from './token-config-utils';
import { ArtToken } from '../../typechain-types';
import { getChainId } from './get-chain-id';
import { TokenMintingPermit } from '../../typechain-types/contracts/art-token/ArtToken';

type MintArgs = {
    artToken: ArtToken;
    permit: TokenMintingPermit.TypeStruct;
    permitSigner: Signer;
    sender: Signer;
};

export class ArtTokenUtils {
    static async mint(args: MintArgs) {
        const { artToken, permit, permitSigner, sender } = args;

        const domain = await this.buildDomain(artToken);

        const tokenConfigHash = TokenConfigUtils.hash(permit.tokenConfig);

        const permitSignature = await permitSigner.signTypedData(
            domain,
            TOKEN_MINTING_PERMIT_TYPE,
            { ...permit, tokenConfig: tokenConfigHash },
        );

        return artToken.connect(sender).mint(permit, permitSignature);
    }

    static async buildDomain(artToken: ArtToken): Promise<TypedDataDomain> {
        const [chainId, verifyingContract] = await Promise.all([
            getChainId(),
            artToken.getAddress(),
        ]);

        return {
            name: ART_TOKEN_DOMAIN_NAME,
            version: ART_TOKEN_DOMAIN_VERSION,
            chainId,
            verifyingContract,
        };
    }
}
