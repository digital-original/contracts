import fs from 'fs';
import yaml from 'js-yaml';
import dotenv from 'dotenv';

import { ethers } from 'ethers';
import '@nomicfoundation/hardhat-toolbox';

import './tasks';

import type { HardhatUserConfig } from 'hardhat/config';
import type { ChainConfig } from './types/environment';
import { NetworksUserConfig } from 'hardhat/types';

dotenv.config();

const config = <Record<string, ChainConfig>>yaml.load(fs.readFileSync('./config.yaml', 'utf8'));

const ENV_MODE = String(process.env.ENV_MODE);
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
        gasPrice: 60,
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

    const hardhatNetworksConfig: NetworksUserConfig = {};

    for (const [chainName, chainConfig] of Object.entries(config)) {
        const {
            chainId,
            url,
            usdc,
            minAuctionDurationHours,
            deployerPrivateKey,
            main,
            artToken,
            auctionHouse,
        } = chainConfig;

        const extra = {
            usdc,
            minAuctionDurationHours,
            main,
            artToken,
            auctionHouse,
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
            forking: { url: config[CHAIN_TO_FORK].url },
            accounts: [
                {
                    privateKey: config[CHAIN_TO_FORK].deployerPrivateKey,
                    balance: ethers.parseEther('100').toString(),
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
