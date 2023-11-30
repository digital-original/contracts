import { TypedDataDomain } from 'ethers';
import { Signer } from '../../types/environment';
import { AuctionPermitStruct } from '../../types/auction';
import {
    AUCTION_DOMAIN_NAME,
    AUCTION_DOMAIN_VERSION,
    AUCTION_PERMIT_TYPE,
} from '../../constants/auction';

export function signAuctionPermit(
    chainId: number,
    verifyingContract: string,
    value: AuctionPermitStruct,
    signer: Signer,
) {
    const domain: TypedDataDomain = {
        name: AUCTION_DOMAIN_NAME,
        version: AUCTION_DOMAIN_VERSION,
        chainId,
        verifyingContract,
    };

    return signer.signTypedData(domain, AUCTION_PERMIT_TYPE, value);
}
