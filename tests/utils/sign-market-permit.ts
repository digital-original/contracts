import { TypedDataDomain } from 'ethers';
import {
    MARKET_DOMAIN_NAME,
    MARKET_DOMAIN_VERSION,
    MARKET_PERMIT_TYPE,
} from '../../constants/market';
import { MarketPermitStruct } from '../../types/market';
import { Signer } from '../../types/environment';

export function signMarketPermit(
    chainId: number,
    verifyingContract: string,
    value: MarketPermitStruct,
    signer: Signer,
) {
    const domain: TypedDataDomain = {
        name: MARKET_DOMAIN_NAME,
        version: MARKET_DOMAIN_VERSION,
        chainId,
        verifyingContract,
    };

    return signer.signTypedData(domain, MARKET_PERMIT_TYPE, value);
}
