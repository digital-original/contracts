import { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox';
import dotenv from 'dotenv';

dotenv.config();

const INFURA_API_KEY = process.env.INFURA_API_KEY!;
const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY!;
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY!;
const REPORT_GAS = process.env.REPORT_GAS!;
const COINMARKETCAP_API_KEY = process.env.COINMARKETCAP_API_KEY!;

const developmentConfig: HardhatUserConfig = {
    networks: {
        sepolia: {
            url: `https://sepolia.infura.io/v3/${INFURA_API_KEY}`,
            accounts: [DEPLOYER_PRIVATE_KEY],
            chainId: 11155111,
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

const testConfig: HardhatUserConfig = {};

const config: HardhatUserConfig = {
    ...(process.env.NODE_ENV === 'test' ? testConfig : developmentConfig),
    solidity: {
        compilers: [
            {
                version: '0.8.19',
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 1000000,
                    },
                },
            },
        ],
    },
};

export default config;

(function () {
    // update console.log to exclude "duplicate definition" log during testing
    const consoleLogOrigin = console.log;
    const log = (...args: any[]) => {
        if (/duplicate definition/.test(args[0])) return;
        consoleLogOrigin(...args);
    };
    console.log = log;
})();
