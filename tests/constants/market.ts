export const MARKET_DOMAIN_NAME = 'Market';
export const MARKET_DOMAIN_VERSION = '1';

export const ASK_ORDER_TYPE = {
    AskOrder: [
        { name: 'collection', type: 'address' },
        { name: 'currency', type: 'address' },
        { name: 'maker', type: 'address' },
        { name: 'tokenId', type: 'uint256' },
        { name: 'price', type: 'uint256' },
        { name: 'makerShare', type: 'uint256' },
        { name: 'startTime', type: 'uint256' },
        { name: 'endTime', type: 'uint256' },
    ],
};

export const BID_ORDER_TYPE = {
    BidOrder: [
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

export const ORDER_EXECUTION_PERMIT_TYPE = {
    OrderExecutionPermit: [
        { name: 'orderHash', type: 'bytes32' },
        { name: 'participants', type: 'address[]' },
        { name: 'shares', type: 'uint256[]' },
        { name: 'deadline', type: 'uint256' },
    ],
};
