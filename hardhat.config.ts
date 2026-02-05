import fs from 'fs';
import yaml from 'js-yaml';

import { parseEther } from 'ethers';
import '@nomicfoundation/hardhat-toolbox';

import './tasks';

import type { HardhatUserConfig } from 'hardhat/config';
import type { NetworksUserConfig } from 'hardhat/types';
import type {
    ChainConfigYaml,
    CollectionConfig,
    CollectionConfigYaml,
    EnvConfigYaml,
    MarketConfig,
    MarketConfigYaml,
    ProtocolConfig,
} from './types/environment';

const envConfigYaml = <EnvConfigYaml>yaml.load(fs.readFileSync('./config.env.yaml', 'utf8'));
const chainConfigYaml = <ChainConfigYaml>yaml.load(fs.readFileSync('./config.chain.yaml', 'utf8'));

const collectionConfigYaml = <CollectionConfigYaml>(
    yaml.load(fs.readFileSync('./config.collection.yaml', 'utf8'))
);
const marketConfigYaml = <MarketConfigYaml>(
    yaml.load(fs.readFileSync('./config.market.yaml', 'utf8'))
);

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
        enabled: envConfigYaml.reportGas,
        token: 'eth',
        currency: 'usd',
        gasPrice: 10,
        coinmarketcap: envConfigYaml.coinmarketcapApiKey,
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
    etherscan: { apiKey: envConfigYaml.etherscanApiKey },
};

function buildHardhatConfig(): HardhatUserConfig {
    if (String(process.env.ENV_MODE) === 'test') {
        return { ...hardhatBaseConfig, ...hardhatTestConfig };
    }

    const hardhatNetworksConfig: NetworksUserConfig = {};

    for (const [chainName, chainConfig] of Object.entries(chainConfigYaml)) {
        const collectionConfig = collectionConfigYaml[chainName];
        const marketConfig = marketConfigYaml[chainName];

        const { chainId, url, deployerPrivateKey, main } = chainConfig;

        const collection: CollectionConfig = {
            name: collectionConfigYaml.name,
            symbol: collectionConfigYaml.symbol,
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

    if (envConfigYaml.fork.name && envConfigYaml.fork.chainId && envConfigYaml.fork.url) {
        hardhatNetworksConfig['fork'] = {
            ...hardhatNetworksConfig[envConfigYaml.fork.name],
            chainId: envConfigYaml.fork.chainId,
            url: envConfigYaml.fork.url,
        };
    }

    if (envConfigYaml.fork.name) {
        hardhatNetworksConfig['hardhat'] = {
            forking: { url: chainConfigYaml[envConfigYaml.fork.name].url },
            accounts: [
                {
                    privateKey: chainConfigYaml[envConfigYaml.fork.name].deployerPrivateKey,
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
