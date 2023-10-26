import type { TypedDataDomain, TypedDataField, Signer } from 'ethers';
import { ORDER_TYPES } from '../constants/common';
import { MARKET_DOMAIN_NAME, MARKET_DOMAIN_VERSION } from '../constants/market';
import { AUCTION_DOMAIN_NAME, AUCTION_DOMAIN_VERSION } from '../constants/auction';
import { OrderStruct } from '../typedefs';

export function createEip712Signature(
    domain: TypedDataDomain,
    types: Record<string, Array<TypedDataField>>,
    value: Record<string, any>,
    signer: Signer,
) {
    return signer.signTypedData(domain, types, value);
}

export function createEip712MarketSignature(
    name: string,
    version: string,
    chainId: number,
    verifyingContract: string,
    value: OrderStruct,
    signer: Signer,
) {
    const domain: TypedDataDomain = {
        name,
        version,
        chainId,
        verifyingContract,
    };

    return createEip712Signature(domain, ORDER_TYPES, value, signer);
}

export function signMarketOrder(
    chainId: number,
    verifyingContract: string,
    value: OrderStruct,
    signer: Signer,
) {
    return createEip712MarketSignature(
        MARKET_DOMAIN_NAME,
        MARKET_DOMAIN_VERSION,
        chainId,
        verifyingContract,
        value,
        signer,
    );
}

export function signAuctionOrder(
    chainId: number,
    verifyingContract: string,
    value: OrderStruct,
    signer: Signer,
) {
    return createEip712MarketSignature(
        AUCTION_DOMAIN_NAME,
        AUCTION_DOMAIN_VERSION,
        chainId,
        verifyingContract,
        value,
        signer,
    );
}
