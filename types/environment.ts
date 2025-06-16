type UpgradeableContractConfig = {
    proxy: string;
    impl: string;
    admin: string;
};

export type ConfigEnv = {
    chainId: number;
    url: string;
    deployerPrivateKey: string;
    usdc: string;
    main: string;
};

export type RecordConfigEnv = Record<string, ConfigEnv>;

export type CollectionData = {
    name: string;
    symbol: string;
};

export type ConfigCollection = CollectionData & {
    minPriceUsd: number;
    minFeeUsd: number;
    regulated: boolean;
    minAuctionDurationHours: number;
    artToken: UpgradeableContractConfig;
    auctionHouse: UpgradeableContractConfig;
};

export type RecordConfigCollection = CollectionData &
    Record<string, Omit<ConfigCollection, keyof CollectionData>>;

export type ChainConfig = ConfigEnv & ConfigCollection;
