export type ChainConfig = {
    chainId: number;
    url: string;
    deployerPrivateKey: string;
    usdc: string;
    main: string;
};

export type CollectionConfig = CollectionData & {
    minPriceUsd: number;
    minFeeUsd: number;
    minAuctionDurationHours: number;
    artToken: UpgradeableContractConfig;
    auctionHouse: UpgradeableContractConfig;
};

export type MarketConfig = {
    market: UpgradeableContractConfig;
};

export type ProtocolConfig = Pick<ChainConfig, 'main' | 'usdc'> & {
    collection: CollectionConfig;
    market: MarketConfig;
};

export type ChainConfigTop = {
    [chainName: string]: ChainConfig;
};

export type CollectionConfigTop = CollectionData & {
    [chainName: string]: Omit<CollectionConfig, keyof CollectionData>;
};

export type MarketConfigTop = {
    [chainName: string]: MarketConfig;
};

type UpgradeableContractConfig = {
    proxy: string;
    impl: string;
    admin: string;
};

type CollectionData = {
    name: string;
    symbol: string;
};
