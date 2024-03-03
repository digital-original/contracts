import { TypedDataDomain } from 'ethers';
import { Signer } from '../../types/environment';
import { CollabPermitStruct } from '../../types/art-token';
import {
    ART_TOKEN_DOMAIN_NAME,
    ART_TOKEN_DOMAIN_VERSION,
    COLLAB_PERMIT_TYPE,
} from '../../constants/art-token';

export function signCollabPermit(
    chainId: number,
    verifyingContract: string,
    value: CollabPermitStruct,
    signer: Signer,
) {
    const domain: TypedDataDomain = {
        name: ART_TOKEN_DOMAIN_NAME,
        version: ART_TOKEN_DOMAIN_VERSION,
        chainId,
        verifyingContract,
    };

    return signer.signTypedData(domain, COLLAB_PERMIT_TYPE, value);
}
