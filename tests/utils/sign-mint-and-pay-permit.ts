import { TypedDataDomain } from 'ethers';
import { Signer } from '../../types/environment';
import { MintAndPayPermitStruct } from '../../types/art-token';
import {
    MINT_AND_PAY_PERMIT_TYPE,
    ART_TOKEN_DOMAIN_NAME,
    ART_TOKEN_DOMAIN_VERSION,
} from '../../constants/art-token';

export function signMintAndPayPermit(
    chainId: number,
    verifyingContract: string,
    value: MintAndPayPermitStruct,
    signer: Signer,
) {
    const domain: TypedDataDomain = {
        name: ART_TOKEN_DOMAIN_NAME,
        version: ART_TOKEN_DOMAIN_VERSION,
        chainId,
        verifyingContract,
    };

    return signer.signTypedData(domain, MINT_AND_PAY_PERMIT_TYPE, value);
}
