import { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox';
import dotenv from 'dotenv';

dotenv.config();

const INFURA_API_KEY = process.env.INFURA_API_KEY!;
const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY!;
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY!;

const developmentConfig: HardhatUserConfig = {
    networks: {
        sepolia: {
            url: `https://sepolia.infura.io/v3/${INFURA_API_KEY}`,
            accounts: [DEPLOYER_PRIVATE_KEY],
            chainId: 11155111,
        },
        local: {
            url: 'http://127.0.0.1:8545/',
        },
    },
    etherscan: {
        apiKey: ETHERSCAN_API_KEY,
    },
};

const testConfig: HardhatUserConfig = {};

const config: HardhatUserConfig = {
    ...(process.env.NODE_ENV === 'test' ? testConfig : developmentConfig),
    solidity: {
        compilers: [
            {
                version: '0.8.17',
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 1000000,
                    },
                    metadata: {
                        bytecodeHash: 'none',
                    },
                },
            },
        ],
    },
    gasReporter: {
        enabled: true,
        currency: 'none',
        gasPrice: 1,
        src: 'contracts',
        excludeContracts: ['contracts/test'],
    },
};

export default config;
