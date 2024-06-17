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
    if (ENV_MODE === 'test' || !ENV_MODE) {
        return { ...hardhatBaseConfig, ...hardhatTestConfig };
    }

    const ethereumUrl = config.ethereum.url;
    const ethereumId = config.ethereum.id;
    const ethereum: ChainConfig = {
        wallets: config.ethereum.env[ENV_MODE]?.wallet,
        contracts: config.ethereum.env[ENV_MODE]?.contract,
        usdc: config.ethereum.usdc,
        minAuctionDurationHours: config.ethereum.env[ENV_MODE]?.minAuctionDurationHours,
    };

    const sepoliaUrl = config.sepolia.url;
    const sepoliaId = config.sepolia.id;
    const sepolia: ChainConfig = {
        wallets: config.sepolia.env[ENV_MODE]?.wallet,
        contracts: config.sepolia.env[ENV_MODE]?.contract,
        usdc: config.sepolia.usdc,
        minAuctionDurationHours: config.sepolia.env[ENV_MODE]?.minAuctionDurationHours,
    };

    const forkUrl = FORKED_CHAIN_URL;
    const forkId = FORKED_CHAIN_ID;
    const fork: ChainConfig = {
        wallets: config[FORKED_CHAIN].env[ENV_MODE]?.wallet,
        contracts: config[FORKED_CHAIN].env[ENV_MODE]?.contract,
        usdc: config[FORKED_CHAIN].usdc,
        minAuctionDurationHours: config[FORKED_CHAIN].env[ENV_MODE]?.minAuctionDurationHours,
    };

    const chainToForkUrl = config[CHAIN_TO_FORK].url;
    const chainToFork: Pick<ChainConfig, 'wallets'> = {
        wallets: config[CHAIN_TO_FORK].env[ENV_MODE]?.wallet,
    };

    const hardhatNetworksConfig: HardhatUserConfig = {
        networks: {
            hardhat: {
                forking: { url: chainToForkUrl },
                ...(chainToFork.wallets?.deployer.private && {
                    accounts: [
                        {
                            privateKey: chainToFork.wallets.deployer.private,
                            balance: ethers.parseEther('100').toString(),
                        },
                    ],
                }),
            },
            fork: {
                url: forkUrl,
                chainId: forkId,
                ...(fork.wallets?.deployer.private && {
                    accounts: [fork.wallets.deployer.private],
                }),
                ...fork,
            },
            sepolia: {
                url: sepoliaUrl,
                chainId: sepoliaId,
                ...(sepolia.wallets?.deployer.private && {
                    accounts: [sepolia.wallets.deployer.private],
                }),
                ...sepolia,
            },
            ethereum: {
                url: ethereumUrl,
                chainId: ethereumId,
                ...(ethereum.wallets?.deployer.private && {
                    accounts: [ethereum.wallets.deployer.private],
                }),
                ...ethereum,
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
