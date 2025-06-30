export const MARKET_DOMAIN_NAME = 'Market';
export const MARKET_DOMAIN_VERSION = '1';

export const ORDER_TYPE = {
    Order: [
        { name: 'side', type: 'uint8' },
        { name: 'collection', type: 'address' },
        { name: 'currency', type: 'address' },
        { name: 'maker', type: 'address' },
        { name: 'tokenId', type: 'uint256' },
        { name: 'price', type: 'uint256' },
        { name: 'makerFee', type: 'uint256' },
        { name: 'startTime', type: 'uint256' },
        { name: 'endTime', type: 'uint256' },
    ],
};

export const EXECUTION_PERMIT_TYPE = {
    ExecutionPermit: [
        { name: 'orderHash', type: 'bytes32' },
        { name: 'taker', type: 'address' },
        { name: 'takerFee', type: 'uint256' },
        { name: 'participants', type: 'address[]' },
        { name: 'rewards', type: 'uint256[]' },
        { name: 'deadline', type: 'uint256' },
    ],
};

export const ASK_SIDE = 0;
export const BID_SIDE = 1;

export const PRICE = 10_000_000_000n;
export const ASK_SIDE_FEE = 100_000_000n;
export const BID_SIDE_FEE = 100_000_000n;
