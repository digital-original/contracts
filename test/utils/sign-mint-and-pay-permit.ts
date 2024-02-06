import { TypedDataDomain } from 'ethers';
import { Signer } from '../../types/environment';
import { MintAndPayPermitStruct } from '../../types/token';
import {
    MINT_AND_PAY_PERMIT_TYPE,
    TOKEN_DOMAIN_NAME,
    TOKEN_DOMAIN_VERSION,
} from '../../constants/token';

export function signMintAndPayPermit(
    chainId: number,
    verifyingContract: string,
    value: MintAndPayPermitStruct,
    signer: Signer,
) {
    const domain: TypedDataDomain = {
        name: TOKEN_DOMAIN_NAME,
        version: TOKEN_DOMAIN_VERSION,
        chainId,
        verifyingContract,
    };

    return signer.signTypedData(domain, MINT_AND_PAY_PERMIT_TYPE, value);
}
