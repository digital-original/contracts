import { Signer, TypedDataDomain } from 'ethers';
import { AuctionHouse } from '../../typechain-types';
import { AuctionCreationPermit } from '../../typechain-types/contracts/auction-house/AuctionHouse';
import { getChainId } from './get-chain-id';
import {
    AUCTION_HOUSE_DOMAIN_NAME,
    AUCTION_HOUSE_DOMAIN_VERSION,
    AUCTION_CREATION_PERMIT_TYPE,
} from '../constants/auction-house';
import { TokenConfigUtils } from './token-config-utils';

type CreateArgs = {
    auctionHouse: AuctionHouse;
    permit: AuctionCreationPermit.TypeStruct;
    permitSigner: Signer;
    sender: Signer;
};

export class AuctionHouseUtils {
    static async create(args: CreateArgs) {
        const { auctionHouse, permit, permitSigner, sender } = args;

        const domain = await this.buildDomain(auctionHouse);

        const tokenConfigHash = TokenConfigUtils.hash(permit.tokenConfig);

        const permitSignature = await permitSigner.signTypedData(
            domain,
            AUCTION_CREATION_PERMIT_TYPE,
            { ...permit, tokenConfig: tokenConfigHash },
        );

        return auctionHouse.connect(sender).create(permit, permitSignature);
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
