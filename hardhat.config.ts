import fs from 'fs';
import yaml from 'js-yaml';
import dotenv from 'dotenv';

import { parseEther } from 'ethers';
import '@nomicfoundation/hardhat-toolbox';

import './tasks';

import type { HardhatUserConfig } from 'hardhat/config';
import type { NetworksUserConfig } from 'hardhat/types';
import type {
    ChainConfigTop,
    CollectionConfig,
    CollectionConfigTop,
    MarketConfig,
    MarketConfigTop,
    ProtocolConfig,
} from './types/environment';

dotenv.config(); // TODO: Migrate params from `.env` to `config.env.yaml`

const ENV_MODE = String(process.env.ENV_MODE);
const COLLECTION = <'do' | 'dn'>String(process.env.COLLECTION);
const CHAIN_TO_FORK = String(process.env.CHAIN_TO_FORK);
const FORKED_CHAIN = String(process.env.FORKED_CHAIN);
const FORKED_CHAIN_URL = String(process.env.FORKED_CHAIN_URL);
const FORKED_CHAIN_ID = Number(process.env.FORKED_CHAIN_ID);
const REPORT_GAS = Boolean(process.env.REPORT_GAS === 'true');
const ETHERSCAN_API_KEY = String(process.env.ETHERSCAN_API_KEY);
const COINMARKETCAP_API_KEY = String(process.env.COINMARKETCAP_API_KEY);

const chainConfigTop = <ChainConfigTop>yaml.load(fs.readFileSync('./config.env.yaml', 'utf8'));
const marketConfigTop = <MarketConfigTop>yaml.load(fs.readFileSync('./config.market.yaml', 'utf8'));
let collectionConfigTop: CollectionConfigTop;

if (COLLECTION == 'do') {
    collectionConfigTop = <CollectionConfigTop>(
        yaml.load(fs.readFileSync('./config.do.yaml', 'utf8'))
    );
} else if (COLLECTION == 'dn') {
    collectionConfigTop = <CollectionConfigTop>(
        yaml.load(fs.readFileSync('./config.dn.yaml', 'utf8'))
    );
} else if (ENV_MODE === 'test') {
    // skip
} else {
    throw new Error(`Invalid 'COLLECTION' value: ${COLLECTION}`);
}

const hardhatBaseConfig: HardhatUserConfig = {
    solidity: {
        compilers: [
            {
                version: '0.8.20',
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 1000000,
                    },
                },
            },
        ],
    },
    paths: {
        sources: './contracts',
        tests: './tests',
        cache: './cache',
        artifacts: './artifacts',
    },
    gasReporter: {
        enabled: REPORT_GAS,
        token: 'eth',
        currency: 'usd',
        gasPrice: 10,
        coinmarketcap: COINMARKETCAP_API_KEY,
    },
};

const hardhatTestConfig: HardhatUserConfig = {
    networks: {
        hardhat: {
            allowUnlimitedContractSize: true,
        },
    },
};

const hardhatEtherscanConfig: HardhatUserConfig = {
    etherscan: { apiKey: ETHERSCAN_API_KEY },
};

function buildHardhatConfig(): HardhatUserConfig {
    if (ENV_MODE === 'test') {
        return { ...hardhatBaseConfig, ...hardhatTestConfig };
    }

    const hardhatNetworksConfig: NetworksUserConfig = {};

    for (const [chainName, chainConfig] of Object.entries(chainConfigTop)) {
        const collectionConfig = collectionConfigTop[chainName];
        const marketConfig = marketConfigTop[chainName];

        const { chainId, url, deployerPrivateKey, main } = chainConfig;

        const collection: CollectionConfig = {
            name: collectionConfigTop.name,
            symbol: collectionConfigTop.symbol,
            minAuctionDurationHours: collectionConfig.minAuctionDurationHours,
            artToken: collectionConfig.artToken,
            auctionHouse: collectionConfig.auctionHouse,
        };

        const market: MarketConfig = {
            market: marketConfig.market,
        };

        const protocolConfig: ProtocolConfig = {
            main,
            collection,
            market,
        };

        hardhatNetworksConfig[chainName] = {
            chainId,
            url,
            accounts: [deployerPrivateKey],
            ...{ protocolConfig },
        };
    }

    if (FORKED_CHAIN_ID && FORKED_CHAIN_URL && FORKED_CHAIN) {
        hardhatNetworksConfig['fork'] = {
            ...hardhatNetworksConfig[FORKED_CHAIN],
            chainId: FORKED_CHAIN_ID,
            url: FORKED_CHAIN_URL,
        };
    }

    if (CHAIN_TO_FORK) {
        hardhatNetworksConfig['hardhat'] = {
            forking: { url: chainConfigTop[CHAIN_TO_FORK].url },
            accounts: [
                {
                    privateKey: chainConfigTop[CHAIN_TO_FORK].deployerPrivateKey,
                    balance: parseEther('100').toString(),
                },
            ],
        };
    }

    const hardhatUserConfig: HardhatUserConfig = {
        networks: hardhatNetworksConfig,
    };

    return {
        ...hardhatBaseConfig,
        ...hardhatEtherscanConfig,
        ...hardhatUserConfig,
    };
}

export default buildHardhatConfig();
