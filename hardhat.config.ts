import { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox';
import dotenv from 'dotenv';
import config from './config.json';
import './tasks/deploy';
import { ChainConfig } from './types/environment';

dotenv.config();

const ENV_MODE = <'local' | 'dev' | 'test'>process.env.ENV_MODE;
const CHAIN_TO_FORK = <'sepolia'>process.env.CHAIN_TO_FORK;
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
    gasReporter: {
        enabled: REPORT_GAS,
        token: 'eth',
        currency: 'usd',
        gasPrice: 33,
        src: 'contracts',
        excludeContracts: ['contracts/test'],
        coinmarketcap: COINMARKETCAP_API_KEY,
    },
};

function buildHardhatConfig(): HardhatUserConfig {
    if (ENV_MODE === 'test') {
        const hardhatTestConfig: HardhatUserConfig = {};

        return { ...hardhatBaseConfig, ...hardhatTestConfig };
    } else {
        const sepoliaUrl = config.sepolia.chainUrl;
        const sepoliaChainId = config.sepolia.chainId;
        const sepolia: ChainConfig = {
            wallets: config.sepolia.env[ENV_MODE].wallet,
            contracts: config.sepolia.env[ENV_MODE].contract,
        };

        const forkUrl = FORKED_CHAIN_URL;
        const forkChainId = FORKED_CHAIN_ID;
        const fork: ChainConfig = {
            wallets: config[CHAIN_TO_FORK].env[ENV_MODE].wallet,
            contracts: config[CHAIN_TO_FORK].env[ENV_MODE].contract,
        };

        const chainUrlToFork = config[CHAIN_TO_FORK].chainUrl;

        return {
            ...hardhatBaseConfig,

            networks: {
                hardhat: {
                    forking: { url: chainUrlToFork },
                },
                fork: {
                    url: forkUrl,
                    chainId: forkChainId,
                    accounts: [fork.wallets.deployer.private],
                    ...fork,
                },
                sepolia: {
                    url: sepoliaUrl,
                    chainId: sepoliaChainId,
                    accounts: [sepolia.wallets.deployer.private],
                    ...sepolia,
                },
            },

            etherscan: { apiKey: ETHERSCAN_API_KEY },
        };
    }
}

export default buildHardhatConfig();
