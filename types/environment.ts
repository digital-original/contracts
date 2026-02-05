/* ################### Chain Config ############################# */
export type ChainConfigYaml = {
    [chainName: string]: ChainChainConfigYaml;
};

type ChainChainConfigYaml = {
    chainId: number;
    url: string;
    deployerPrivateKey: string;
    main: string;
};

/* ################### Collection Config ############################# */

export type CollectionConfigYaml = CollectionDataYaml & {
    [chainName: string]: ChainCollectionConfigYaml;
};

type CollectionDataYaml = {
    name: string;
    symbol: string;
};

type ChainCollectionConfigYaml = {
    minAuctionDurationHours: number;
    artToken: UpgradeableContractConfig;
    auctionHouse: UpgradeableContractConfig;
};

/* ################### Market Config ############################# */

export type MarketConfigYaml = {
    [chainName: string]: ChainMarketConfigYaml;
};

type ChainMarketConfigYaml = {
    market: UpgradeableContractConfig;
};

/* ################### Env Config ############################# */

export type EnvConfigYaml = {
    fork: {
        name: string;
        chainId: number;
        url: string;
    };
    reportGas: boolean;
    etherscanApiKey: string;
    coinmarketcapApiKey: string;
};

/* ################### Formatted Configs ############################# */

export type EnvConfig = EnvConfigYaml;
export type ChainConfig = ChainChainConfigYaml;
export type CollectionConfig = CollectionDataYaml & ChainCollectionConfigYaml;
export type MarketConfig = ChainMarketConfigYaml;

export type ProtocolConfig = Pick<ChainChainConfigYaml, 'main'> & {
    collection: CollectionConfig;
    market: MarketConfig;
};

/* ################### Common Types ############################# */

type UpgradeableContractConfig = {
    proxy: string;
    impl: string;
    admin: string;
};
