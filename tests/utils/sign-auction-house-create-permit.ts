import { TypedDataDomain } from 'ethers';
import { Signer } from '../../types/environment';
import { CreatePermitStruct } from '../../types/auction-house';
import {
    AUCTION_HOUSE_DOMAIN_NAME,
    AUCTION_HOUSE_DOMAIN_VERSION,
    CREATE_PERMIT_TYPE,
} from '../../constants/auction-house';

export function signCreatePermit(
    chainId: number,
    verifyingContract: string,
    value: CreatePermitStruct,
    signer: Signer,
) {
    const domain: TypedDataDomain = {
        name: AUCTION_HOUSE_DOMAIN_NAME,
        version: AUCTION_HOUSE_DOMAIN_VERSION,
        chainId,
        verifyingContract,
    };

    return signer.signTypedData(domain, CREATE_PERMIT_TYPE, value);
}
