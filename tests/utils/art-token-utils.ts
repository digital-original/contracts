import { Signer, TypedDataDomain } from 'ethers';
import { BuyPermitStruct } from '../../types/art-token';
import {
    ART_TOKEN_DOMAIN_NAME,
    ART_TOKEN_DOMAIN_VERSION,
    BUY_PERMIT_TYPE,
} from '../constants/art-token';
import { ArtToken } from '../../typechain-types';
import { getChainId } from './get-chain-id';

type BuyArgs = {
    artToken: ArtToken;
    permit: BuyPermitStruct;
    permitSigner: Signer;
    sender: Signer;
};

export class ArtTokenUtils {
    static async buy(args: BuyArgs) {
        const { artToken, permit, permitSigner, sender } = args;

        const domain = await this.buildDomain(artToken);

        const signature = await permitSigner.signTypedData(domain, BUY_PERMIT_TYPE, permit);

        return artToken.connect(sender).buy({
            ...permit,
            signature,
        });
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
