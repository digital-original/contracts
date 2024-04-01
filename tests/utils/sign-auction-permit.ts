import { TypedDataDomain } from 'ethers';
import { Signer } from '../../types/environment';
import { AuctionPermitStruct } from '../../types/auction-house';
import {
    AUCTION_HOUSE_DOMAIN_NAME,
    AUCTION_HOUSE_DOMAIN_VERSION,
    AUCTION_PERMIT_TYPE,
} from '../../constants/auction-house';

export function signAuctionPermit(
    chainId: number,
    verifyingContract: string,
    value: AuctionPermitStruct,
    signer: Signer,
) {
    const domain: TypedDataDomain = {
        name: AUCTION_HOUSE_DOMAIN_NAME,
        version: AUCTION_HOUSE_DOMAIN_VERSION,
        chainId,
        verifyingContract,
    };

    return signer.signTypedData(domain, AUCTION_PERMIT_TYPE, value);
}