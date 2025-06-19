import { Signer, TypedDataDomain, TypedDataEncoder } from 'ethers';
import {
    ASK_ORDER_TYPE,
    BID_ORDER_TYPE,
    MARKET_DOMAIN_NAME,
    MARKET_DOMAIN_VERSION,
    ORDER_EXECUTION_PERMIT_TYPE,
} from '../constants/market';
import { Market } from '../../typechain-types';
import { AskOrder, OrderExecutionPermit } from '../../typechain-types/contracts/market/Market';
import { getChainId } from './get-chain-id';
import { BidOrder } from '../../typechain-types/contracts/market/IMarket';

type ExecuteAskArgs = {
    market: Market;
    order: AskOrder.TypeStruct;
    permit: OrderExecutionPermit.TypeStruct & { orderHash?: string };
    orderSigner: Signer;
    permitSigner: Signer;
    sender: Signer;
};

type ExecuteBidArgs = {
    market: Market;
    order: BidOrder.TypeStruct;
    permit: OrderExecutionPermit.TypeStruct & { orderHash?: string };
    orderSigner: Signer;
    permitSigner: Signer;
    sender: Signer;
};

export class MarketUtils {
    static async executeAsk(args: ExecuteAskArgs) {
        const { market, order, permit, orderSigner, permitSigner, sender } = args;

        const domain = await this.buildDomain(market);

        const orderSignature = await orderSigner.signTypedData(domain, ASK_ORDER_TYPE, order);

        const orderHash = permit.orderHash || this.hashAskOrder(order);

        const permitSignature = await permitSigner.signTypedData(
            domain,
            ORDER_EXECUTION_PERMIT_TYPE,
            {
                ...permit,
                orderHash,
            },
        );

        return market.connect(sender).executeAsk(order, permit, orderSignature, permitSignature);
    }

    static async executeBid(args: ExecuteBidArgs) {
        const { market, order, permit, orderSigner, permitSigner, sender } = args;

        const domain = await this.buildDomain(market);

        const orderSignature = await orderSigner.signTypedData(domain, BID_ORDER_TYPE, order);

        const orderHash = permit.orderHash || this.hashBidOrder(order);

        const permitSignature = await permitSigner.signTypedData(
            domain,
            ORDER_EXECUTION_PERMIT_TYPE,
            {
                ...permit,
                orderHash,
            },
        );

        return market.connect(sender).executeBid(order, permit, orderSignature, permitSignature);
    }

    static async buildDomain(market: Market): Promise<TypedDataDomain> {
        const [chainId, verifyingContract] = await Promise.all([getChainId(), market.getAddress()]);

        return {
            name: MARKET_DOMAIN_NAME,
            version: MARKET_DOMAIN_VERSION,
            chainId,
            verifyingContract,
        };
    }

    static hashAskOrder(order: AskOrder.TypeStruct) {
        return TypedDataEncoder.from(ASK_ORDER_TYPE).hash(order);
    }

    static hashBidOrder(order: BidOrder.TypeStruct) {
        return TypedDataEncoder.from(BID_ORDER_TYPE).hash(order);
    }
}
