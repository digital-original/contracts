import { TypedDataDomain } from 'ethers';
import { Signer } from '../../types/environment';
import { AuctionRaisePermitStruct } from '../../types/auction-house';
import {
    AUCTION_HOUSE_DOMAIN_NAME,
    AUCTION_HOUSE_DOMAIN_VERSION,
    AUCTION_RAISE_PERMIT_TYPE,
} from '../../constants/auction-house';

export function signAuctionRaisePermit(
    chainId: number,
    verifyingContract: string,
    value: AuctionRaisePermitStruct,
    signer: Signer,
) {
    const domain: TypedDataDomain = {
        name: AUCTION_HOUSE_DOMAIN_NAME,
        version: AUCTION_HOUSE_DOMAIN_VERSION,
        chainId,
        verifyingContract,
    };

    return signer.signTypedData(domain, AUCTION_RAISE_PERMIT_TYPE, value);
}
