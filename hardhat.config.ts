import { HardhatUserConfig } from 'hardhat/config';
import dotenv from 'dotenv';
import '@nomicfoundation/hardhat-toolbox';
import './src/tasks/deploy';
import config from './config.json';

dotenv.config();

const ENV_MODE = <'local' | 'dev' | 'test'>process.env.ENV_MODE!;

const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY!;
const REPORT_GAS = process.env.REPORT_GAS!;
const COINMARKETCAP_API_KEY = process.env.COINMARKETCAP_API_KEY!;

const hardhatBaseConfig: HardhatUserConfig = {
    paths: {
        sources: './src/contracts',
        tests: './test',
        cache: './cache',
        artifacts: './artifacts',
    },
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
    gasReporter: { enabled: false },
};

function buildHardhatConfig(): HardhatUserConfig {
    if (ENV_MODE === 'test') {
        const hardhatTestConfig: HardhatUserConfig = {};

        return { ...hardhatBaseConfig, ...hardhatTestConfig };
    } else {
        const chainFork = 'sepolia';

        const chainConfigs = {
            sepolia: {
                wallets: config.sepolia.env[ENV_MODE].wallet,
                contracts: config.sepolia.env[ENV_MODE].contract,
            },
            fork: {
                wallets: config[chainFork].env[ENV_MODE].wallet,
                contracts: config[chainFork].env[ENV_MODE].contract,
            },
        };

        return {
            ...hardhatBaseConfig,

            networks: {
                hardhat: { forking: { url: config[chainFork].chainUrl } },
                fork: {
                    chainId: 31337,
                    url: 'http://localhost:8545/',
                    accounts: [chainConfigs.fork.wallets.deployer.private],
                    ...chainConfigs.fork,
                },
                sepolia: {
                    url: config.sepolia.chainUrl,
                    chainId: config.sepolia.chainId,
                    accounts: [chainConfigs.sepolia.wallets.deployer.private],
                    ...chainConfigs.sepolia,
                },
            },
            etherscan: {
                apiKey: ETHERSCAN_API_KEY,
            },
            gasReporter: {
                enabled: !!REPORT_GAS,
                token: 'eth',
                currency: 'usd',
                gasPrice: 26,
                src: 'contracts',
                excludeContracts: ['contracts/test'],
                coinmarketcap: COINMARKETCAP_API_KEY,
            },
        };
    }
}

export default buildHardhatConfig();
