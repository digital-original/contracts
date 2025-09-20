import { Signer, TypedDataDomain, TypedDataEncoder } from 'ethers';
import {
    MARKET_DOMAIN_NAME,
    MARKET_DOMAIN_VERSION,
    ORDER_TYPE,
    ORDER_EXECUTION_PERMIT_TYPE,
} from '../constants/market';
import { Market } from '../../typechain-types';
import { Order, OrderExecutionPermit } from '../../typechain-types/contracts/market/Market';
import { getChainId } from './get-chain-id';

type ExecuteAskArgs = {
    market: Market;
    order: Order.TypeStruct;
    permit: OrderExecutionPermit.TypeStruct;
    orderSigner: Signer;
    permitSigner: Signer;
    sender: Signer;
};

type ExecuteBidArgs = {
    market: Market;
    order: Order.TypeStruct;
    permit: OrderExecutionPermit.TypeStruct;
    orderSigner: Signer;
    permitSigner: Signer;
    sender: Signer;
};

export class MarketUtils {
    static async executeAsk(args: ExecuteAskArgs) {
        const { market, order, permit, orderSigner, permitSigner, sender } = args;

        const domain = await this.buildDomain(market);

        const orderSignature = await orderSigner.signTypedData(domain, ORDER_TYPE, order);

        const permitSignature = await permitSigner.signTypedData(
            domain,
            ORDER_EXECUTION_PERMIT_TYPE,
            permit,
        );

        return market.connect(sender).executeAsk(order, permit, orderSignature, permitSignature);
    }

    static async executeBid(args: ExecuteBidArgs) {
        const { market, order, permit, orderSigner, permitSigner, sender } = args;

        const domain = await this.buildDomain(market);

        const orderSignature = await orderSigner.signTypedData(domain, ORDER_TYPE, order);

        const permitSignature = await permitSigner.signTypedData(
            domain,
            ORDER_EXECUTION_PERMIT_TYPE,
            permit,
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

    static hashOrder(order: Order.TypeStruct) {
        return TypedDataEncoder.from(ORDER_TYPE).hash(order);
    }
}
