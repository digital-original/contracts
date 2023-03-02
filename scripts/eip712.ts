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

const MARKET_DOMAIN_NAME = 'Market';
const MARKET_DOMAIN_VERSION = '1';
const ORDER_TYPES = {
    Order: [
        { name: 'seller', type: 'address' },
        { name: 'tokenId', type: 'uint256' },
        { name: 'price', type: 'uint256' },
        { name: 'participants', type: 'address[]' },
        { name: 'shares', type: 'uint256[]' },
        { name: 'nonce', type: 'uint256' },
    ],
};

export interface OrderTypedDataInterface {
    seller: string;
    tokenId: string;
    price: string;
    participants: string[];
    shares: string[];
    nonce: string;
}

export async function signMarketOrder(
    signer: SignerWithAddress,
    verifyingContract: string,
    value: OrderTypedDataInterface
) {
    const domain: TypedDataDomain = {
        name: MARKET_DOMAIN_NAME,
        version: MARKET_DOMAIN_VERSION,
        chainId: (await ethers.provider.getNetwork()).chainId,
        verifyingContract,
    };

    return createEip712Signature(signer, domain, ORDER_TYPES, value);
}
