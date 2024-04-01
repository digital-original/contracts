import fs from 'fs';
import yaml from 'js-yaml';
import dotenv from 'dotenv';
import * as ethers from 'ethers';
import '@nomicfoundation/hardhat-toolbox';
import './tasks';
import type { HardhatUserConfig } from 'hardhat/config';
import type { ChainConfig } from './types/environment';

dotenv.config();

const config: any = yaml.load(fs.readFileSync('./config.yaml', 'utf8'));

const ENV_MODE = <'local' | 'dev' | 'test'>process.env.ENV_MODE;
const CHAIN_TO_FORK = <'sepolia'>process.env.CHAIN_TO_FORK;
const FORKED_CHAIN = <'sepolia'>process.env.FORKED_CHAIN;
const FORKED_CHAIN_URL = process.env.FORKED_CHAIN_URL!;
const FORKED_CHAIN_ID = Number(process.env.FORKED_CHAIN_ID);
const REPORT_GAS = process.env.REPORT_GAS === 'true';
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY!;
const COINMARKETCAP_API_KEY = process.env.COINMARKETCAP_API_KEY!;

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
        gasPrice: 33,
        src: 'contracts',
        coinmarketcap: COINMARKETCAP_API_KEY,
    },
};

const hardhatTestConfig: HardhatUserConfig = {};

const hardhatEtherscanConfig: HardhatUserConfig = {
    etherscan: { apiKey: ETHERSCAN_API_KEY },
};

function buildHardhatConfig(): HardhatUserConfig {
    if (ENV_MODE === 'test' || !ENV_MODE) {
        return { ...hardhatBaseConfig, ...hardhatTestConfig };
    }

    const sepoliaUrl = config.sepolia.url;
    const sepoliaId = config.sepolia.id;
    const sepolia: ChainConfig = {
        wallets: config.sepolia.env[ENV_MODE].wallet,
        contracts: config.sepolia.env[ENV_MODE].contract,
    };

    const forkUrl = FORKED_CHAIN_URL;
    const forkId = FORKED_CHAIN_ID;
    const fork: ChainConfig = {
        wallets: config[FORKED_CHAIN].env[ENV_MODE].wallet,
        contracts: config[FORKED_CHAIN].env[ENV_MODE].contract,
    };

    const hardhatNetworksConfig: HardhatUserConfig = {
        networks: {
            hardhat: {
                forking: { url: config[CHAIN_TO_FORK].url },
                accounts: [
                    {
                        privateKey: fork.wallets.deployer.private,
                        balance: ethers.parseEther('100').toString(),
                    },
                ],
            },
            fork: {
                url: forkUrl,
                chainId: forkId,
                accounts: [fork.wallets.deployer.private],
                ...fork,
            },
            sepolia: {
                url: sepoliaUrl,
                chainId: sepoliaId,
                accounts: [sepolia.wallets.deployer.private],
                ...sepolia,
            },
        },
    };

    return {
        ...hardhatBaseConfig,
        ...hardhatEtherscanConfig,
        ...hardhatNetworksConfig,
    };
}

export default buildHardhatConfig();
