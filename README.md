![solidity](https://img.shields.io/badge/solidity-0.8.20-363636)
![openzeppelin](https://img.shields.io/badge/built%20with-OpenZeppelin-brightgreen)
![hardhat](https://img.shields.io/badge/built%20with-Hardhat-blueviolet)
![tests](https://github.com/digital-original/contracts/actions/workflows/test.yml/badge.svg)
![license](https://img.shields.io/badge/license-GPLv3-blue)

# Digital Original Smart Contracts

A modular on-chain framework for NFT primary sales and secondary markets. This repository contains the core Solidity implementations, testing suites, and deployment tooling for the Digital Original protocol.

## Architecture Overview

The DO protocol is built on a modular, upgradeable architecture designed for security and scalability.

- **Signature-Based Authorization**: Most protocol actions (minting, auctions, market orders) are authorized off-chain via EIP-712 permits and executed on-chain.
- **Upgradeable Core**: Contracts utilize a proxy-implementation pattern with explicit storage layouts to allow for seamless protocol upgrades.
- **Unified Role System**: Granular access control is managed through a central `RoleSystem` inherited by all core components.
- **Multi-Currency Support**: A `CurrencyManager` module allows the protocol to interact with an arbitrary list of approved ERC-20 tokens.

## Core Contracts

### ArtToken
An upgradeable ERC-721 implementation with integrated primary-sale logic.
- **Token Minting**: Requires cryptographic authorization from designated signers.
- **Transfer Restrictions**: Optional enforcement for regulated collections.
- **Revenue Distribution**: Automatic on-chain splits for primary sale proceeds.

### AuctionHouse
Manages English-style auctions for primary NFT releases.
- **Auction Creation**: Requires cryptographic authorization from designated signers.
- **Escrow-less Bidding**: Refunds are handled automatically during the bidding process.

### Market
A secondary marketplace facilitating peer-to-peer trading.
- **Off-chain Orders**: Supports EIP-712 signed 'Asks' and 'Bids'.
- **Fees**: Supports maker and taker fee.

## Environment Setup

### Prerequisites
- **Node.js**: ^24.6.0
- **Python**: ^3.13.7 (for Slither)

### Installation
```bash
npm install
```
This will automatically run the `prepare` script, initializing your configuration files from templates.

### Configuration
The project uses four YAML-based configuration files:
1. `config.env.yaml`: API keys for Etherscan, CoinMarketCap, and Gas Reporter.
2. `config.chain.yaml`: RPC URLs and deployer wallet aliases per network.
3. `config.collection.yaml`: Parameters for the NFT collection.
4. `config.market.yaml`: Parameters for the marketplace.

### Hardhat Configuration Variables
Actual private keys are not stored in YAML files. Instead, they are managed via [Hardhat Configuration Variables](https://hardhat.org/hardhat-runner/docs/guides/configuration-variables).

To set a private key for a specific wallet alias (e.g., `sepolia-deployer-wallet`), run:
```bash
npx hardhat vars set sepolia-deployer-wallet
```
You will be prompted to enter the private key value.

## Development Lifecycle

### Compilation
```bash
npm run compile
```

### Running Tests
```bash
npm run test
```

### Local Forking
To start a local node forking a network defined in your config:
```bash
npm run fork
```
In a separate terminal, you can then use hardhat tasks:
```bash
npx hardhat deploy-collection --network fork
```

### Static Analysis
To run Slither for smart contract security analysis, you need to set up a Python virtual environment first:
```bash
# Create a virtual environment
python3 -m venv venv

# Activate the virtual environment
source venv/bin/activate

# Install Python dependencies (including slither-analyzer)
pip install -r requirements.txt

# Compile contracts
npm run compile

# Run Slither analysis
npm run slither
```
The Slither configuration is defined in `slither.config.json`. After running, you can deactivate the virtual environment with:
```bash
deactivate
```

## Deployment & Verification

Deployments are handled via Hardhat tasks. Always specify the `--network` flag.

- **Deploy Full Suite**:
```bash
npx hardhat deploy-collection --network <network>
npx hardhat deploy-market --network <network>
```
- **Deploy Individual Implementations**:
```bash
npx hardhat deploy-art-token-impl --network <network>
npx hardhat deploy-auction-house-impl --network <network>
npx hardhat deploy-market-impl --network <network>
```
- **Verification**:
```bash
npx hardhat verify-art-token --network <network>
npx hardhat verify-auction-house --network <network>
npx hardhat verify-market --network <network>
```

## Project Structure

```text
├── contracts/
│   ├── art-token/       # ERC-721 and minting logic
│   ├── auction-house/   # Primary auction logic
│   ├── market/          # Secondary trading logic
│   └── utils/           # Shared modules (Roles, Currency, etc.)
├── scripts/             # Deployment scripts
├── tasks/               # Hardhat tasks (deploy/verify)
└── tests/               # TypeScript test suite
```

## License

Licensed under **GPL-3.0** – see [LICENSE](./LICENSE) for details.
