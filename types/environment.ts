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

/* ################### Chain Config ############################# */
export type ChainConfigYaml = {
    [chainName: string]: ChainConfig;
};

type ChainConfig = {
    chainId: number;
    url: string;
    deployerPrivateKey: string;
    main: string;
    wrappedEther: string;
};

/* ################### Collection Config ############################# */

export type CollectionConfigYaml = {
    [chainName: string]: CollectionConfig;
};

type CollectionConfig = {
    name: string;
    symbol: string;
    minAuctionDurationHours: number;
    artToken: UpgradeableContractConfig;
    auctionHouse: UpgradeableContractConfig;
};

/* ################### Market Config ############################# */

export type MarketConfigYaml = {
    [chainName: string]: MarketConfig;
};

type MarketConfig = UpgradeableContractConfig;

/* ################### Protocol Config ############################# */

export type ProtocolConfig = Pick<ChainConfig, 'main' | 'wrappedEther'> & {
    collection: CollectionConfig;
    market: MarketConfig;
};

/* ################### Common Types ############################# */

type UpgradeableContractConfig = {
    proxy: string;
    impl: string;
    admin: string;
};
