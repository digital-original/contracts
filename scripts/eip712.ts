import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { TypedDataDomain, TypedDataField } from 'ethers';
import { ethers } from 'hardhat';

async function createEip712Signature(
    signer: SignerWithAddress,
    domain: TypedDataDomain,
    types: Record<string, Array<TypedDataField>>,
    value: Record<string, any>
) {
    return signer._signTypedData(domain, types, value);
}

const ORDER_TYPES = {
    Order: [
        { name: 'seller', type: 'address' },
        { name: 'tokenId', type: 'uint256' },
        { name: 'price', type: 'uint256' },
        { name: 'participants', type: 'address[]' },
        { name: 'shares', type: 'uint256[]' },
        { name: 'expiredBlock', type: 'uint256' },
    ],
};

export interface OrderTypedDataInterface {
    seller: string;
    tokenId: string;
    price: string | number;
    participants: string[];
    shares: string[] | number[];
    expiredBlock: number;
}

export async function createEip712MarketSignature(
    name: string,
    version: string,
    signer: SignerWithAddress,
    verifyingContract: string,
    value: OrderTypedDataInterface
) {
    const domain: TypedDataDomain = {
        name,
        version,
        chainId: (await ethers.provider.getNetwork()).chainId,
        verifyingContract,
    };

    return createEip712Signature(signer, domain, ORDER_TYPES, value);
}

const MARKET_DOMAIN_NAME = 'Market';
const MARKET_DOMAIN_VERSION = '1';

export function signMarketOrder(
    signer: SignerWithAddress,
    verifyingContract: string,
    value: OrderTypedDataInterface
) {
    return createEip712MarketSignature(
        MARKET_DOMAIN_NAME,
        MARKET_DOMAIN_VERSION,
        signer,
        verifyingContract,
        value,
    );
}

const AUCTION_DOMAIN_NAME = 'Auction';
const AUCTION_DOMAIN_VERSION = '1';

export function signAuctionOrder(
    signer: SignerWithAddress,
    verifyingContract: string,
    value: OrderTypedDataInterface
) {
    return createEip712MarketSignature(
        AUCTION_DOMAIN_NAME,
        AUCTION_DOMAIN_VERSION,
        signer,
        verifyingContract,
        value,
    );
}
