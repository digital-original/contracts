import { Signer, TypedDataDomain } from 'ethers';
import { AuctionHouse } from '../../typechain-types';
import { CreatePermitStruct } from '../../types/auction-house';
import { getChainId } from './get-chain-id';
import {
    AUCTION_HOUSE_DOMAIN_NAME,
    AUCTION_HOUSE_DOMAIN_VERSION,
    CREATE_PERMIT_TYPE,
} from '../constants/auction-house';

type CreateArgs = {
    auctionHouse: AuctionHouse;
    permit: CreatePermitStruct;
    permitSigner: Signer;
    sender: Signer;
};

export class AuctionHouseUtils {
    static async create(args: CreateArgs) {
        const { auctionHouse, permit, permitSigner, sender } = args;

        const domain = await this.buildDomain(auctionHouse);

        const signature = await permitSigner.signTypedData(domain, CREATE_PERMIT_TYPE, permit);

        return auctionHouse.connect(sender).create({
            ...permit,
            signature,
        });
    }

    static async buildDomain(auctionHouse: AuctionHouse): Promise<TypedDataDomain> {
        const [chainId, verifyingContract] = await Promise.all([
            getChainId(),
            auctionHouse.getAddress(),
        ]);

        return {
            name: AUCTION_HOUSE_DOMAIN_NAME,
            version: AUCTION_HOUSE_DOMAIN_VERSION,
            chainId,
            verifyingContract,
        };
    }
}
