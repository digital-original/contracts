import fs from 'fs';
import yaml from 'js-yaml';
import dotenv from 'dotenv';

import { parseEther } from 'ethers';
import '@nomicfoundation/hardhat-toolbox';

import './tasks';

import type { HardhatUserConfig } from 'hardhat/config';
import type { NetworksUserConfig } from 'hardhat/types';
import type { RecordConfigCollection, RecordConfigEnv } from './types/environment';

dotenv.config();

const configEnv = <RecordConfigEnv>yaml.load(fs.readFileSync('./config.env.yaml', 'utf8'));
const configDo = <RecordConfigCollection>yaml.load(fs.readFileSync('./config.do.yaml', 'utf8'));
const configDn = <RecordConfigCollection>yaml.load(fs.readFileSync('./config.dn.yaml', 'utf8'));

const ENV_MODE = String(process.env.ENV_MODE);
const COLLECTION = <'do' | 'dn'>String(process.env.COLLECTION);
const CHAIN_TO_FORK = String(process.env.CHAIN_TO_FORK);
const FORKED_CHAIN = String(process.env.FORKED_CHAIN);
const FORKED_CHAIN_URL = String(process.env.FORKED_CHAIN_URL);
const FORKED_CHAIN_ID = Number(process.env.FORKED_CHAIN_ID);
const REPORT_GAS = Boolean(process.env.REPORT_GAS === 'true');
const ETHERSCAN_API_KEY = String(process.env.ETHERSCAN_API_KEY);
const COINMARKETCAP_API_KEY = String(process.env.COINMARKETCAP_API_KEY);

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
        src: 'contracts',
        coinmarketcap: COINMARKETCAP_API_KEY,
    },
};

const hardhatTestConfig: HardhatUserConfig = {};

const hardhatEtherscanConfig: HardhatUserConfig = {
    etherscan: { apiKey: ETHERSCAN_API_KEY },
};

function buildHardhatConfig(): HardhatUserConfig {
    if (ENV_MODE === 'test') {
        return { ...hardhatBaseConfig, ...hardhatTestConfig };
    }

    let configCollection: RecordConfigCollection;

    if (COLLECTION == 'do') {
        configCollection = configDo;
    } else if (COLLECTION == 'dn') {
        configCollection = configDn;
    } else {
        throw new Error(`Invalid 'COLLECTION' value: ${COLLECTION}`);
    }

    const hardhatNetworksConfig: NetworksUserConfig = {};

    for (const [chainName, _configEnv] of Object.entries(configEnv)) {
        const _configCollection = configCollection[chainName];

        const { chainId, url, deployerPrivateKey, usdc, main } = _configEnv;

        const extra = {
            name: configCollection.name,
            symbol: configCollection.symbol,
            usdc,
            main,
            minPriceUsd: _configCollection.minPriceUsd,
            minFeeUsd: _configCollection.minFeeUsd,
            regulated: _configCollection.regulated,
            minAuctionDurationHours: _configCollection.minAuctionDurationHours,
            artToken: _configCollection.artToken,
            auctionHouse: _configCollection.auctionHouse,
        };

        hardhatNetworksConfig[chainName] = {
            chainId,
            url,
            accounts: [deployerPrivateKey],
            ...extra,
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
            forking: { url: configEnv[CHAIN_TO_FORK].url },
            accounts: [
                {
                    privateKey: configEnv[CHAIN_TO_FORK].deployerPrivateKey,
                    balance: parseEther('100').toString(),
                },
            ],
        };
    }

    const hardhatConfig: HardhatUserConfig = {
        networks: hardhatNetworksConfig,
    };

    return {
        ...hardhatBaseConfig,
        ...hardhatEtherscanConfig,
        ...hardhatConfig,
    };
}

export default buildHardhatConfig();
