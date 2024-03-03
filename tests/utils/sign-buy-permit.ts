import { TypedDataDomain } from 'ethers';
import { Signer } from '../../types/environment';
import { BuyPermitStruct } from '../../types/art-token';
import {
    ART_TOKEN_DOMAIN_NAME,
    ART_TOKEN_DOMAIN_VERSION,
    BUY_PERMIT_TYPE,
} from '../../constants/art-token';

export function signBuyPermit(
    chainId: number,
    verifyingContract: string,
    value: BuyPermitStruct,
    signer: Signer,
) {
    const domain: TypedDataDomain = {
        name: ART_TOKEN_DOMAIN_NAME,
        version: ART_TOKEN_DOMAIN_VERSION,
        chainId,
        verifyingContract,
    };

    return signer.signTypedData(domain, BUY_PERMIT_TYPE, value);
}
