![solidity](https://img.shields.io/badge/solidity-0.8.20-363636)
![openzeppelin](https://img.shields.io/badge/built%20with-OpenZeppelin-brightgreen)
![hardhat](https://img.shields.io/badge/built%20with-Hardhat-blueviolet)
![tests](https://github.com/digital-original/contracts/actions/workflows/test.yml/badge.svg)
![license](https://img.shields.io/badge/license-GPLv3-blue)

# Digital Original – Smart-Contracts Suite

Digital Original (DO) is a modular on-chain framework for managing primary sales and secondary markets of digital collectibles (NFTs).
This repository hosts all **Solidity smart-contracts, tests and tooling** required to deploy and operate the protocol.

## 🧩 Features

- **Primary Sales & Minting**: Directly mint and purchase NFTs with built-in revenue distribution.
- **Secondary Markets**: Peer-to-peer trading of NFTs with off-chain order matching.
- **Auction House**: English-style auctions for primary NFT sales.
- **EIP-712 Permits**: Gas-efficient and secure transactions with cryptographic authorization.
- **Role-Based Access Control**: Granular control over contract functions and administrative actions.
- **Flexible Fee Structures**: Configurable maker and taker fees for market transactions.
- **Multi-Currency Support**: Support for multiple ERC-20 tokens for payments.
- **Upgradeable Contracts**: Upgradeable contract architecture for future improvements.

## 📚 Contracts

### ArtToken

The `ArtToken` contract is an upgradeable ERC-721 NFT implementation that serves as the core collectible in the Digital Original ecosystem. Key features:

- **Primary Sales**: Supports direct minting and purchasing through the `mint()` function with built-in revenue distribution
- **EIP-712 Permits**: All primary sales require cryptographic authorization from designated signers
- **Compliance & Regulation**: Optional transfer restrictions for regulated tokens
- **AuctionHouse Integration**: Works seamlessly with the AuctionHouse for auction-based primary sales
- **Revenue Splitting**: Automatic distribution of sale proceeds among multiple participants according to predefined shares

### AuctionHouse

The `AuctionHouse` contract manages English-style auctions for primary NFT sales. Key features:

- **Auction Creation**: Authorized creation of time-bound auctions with EIP-712 signatures
- **Bidding System**: Progressive bidding with minimum raise steps and automatic refunds to outbid participants
- **Multi-Currency**: Configurable support for multiple ERC-20 payment currencies

### Market

The `Market` contract facilitates peer-to-peer secondary trading of NFTs through off-chain order matching. Key features:

- **Order Types**: Supports both sell-side (ask) and buy-side (bid) orders
- **Off-chain Orders**: Gas-efficient trading through EIP-712 signed orders executed on-chain
- **Multi-Currency**: Configurable support for multiple ERC-20 payment currencies
- **Order Management**: Order invalidation capabilities for makers and admins
- **Fee Structure**: Flexible fee system supporting both maker and taker fees
- **Revenue Sharing**: Built-in mechanism for distributing fees among multiple participants
- **Security**: Time-bound orders with replay protection and signature verification

## 🏃🏽 Getting Started

### 📋 Prerequisites
- [Node.js](https://nodejs.org/) (v24+)
- [Python](https://www.python.org/) (for static analysis)

### ⚡️ Quick Start
```bash
# 1. install deps
npm install

# 2. init config templates
source ./init.sh

# 3. compile
npm run compile

# 4. run the tests
npm run test
```

### ⚙️ Configuration

The project uses YAML files for configuration. You'll need to create your own configuration files by copying the example files and editing them with your desired settings.

Every Hardhat network entry gets enriched with a `protocolConfig` object at runtime, see `hardhat.config.ts`.

1. **Environment Config:** Copy `config.env.example.yaml` to `config.env.yaml` and add your API keys (e.g., Etherscan, CoinMarketCap).

2. **Chain Config:** Copy `config.chain.example.yaml` to `config.chain.yaml` and add your RPC URLs and deployer private keys for the desired networks.

3. **Collection Config:** Copy `config.collection.example.yaml` to `config.collection.yaml` and configure the art token collection parameters.

4. **Market Config:** Copy `config.market.example.yaml` to `config.market.yaml` and configure the marketplace parameters.

### 🍴 Local Fork

Spin up a mainnet-fork using the URL from `config.chain.yaml`:
```bash
npm run fork
```

In a separate terminal, you can then use hardhat tasks:
```bash
npx hardhat deploy-collection --network fork
```

### 📜 NPM Scripts

| Script            | Description                                                        |
| ----------------- | ------------------------------------------------------------------ |
| `npm run compile` | Clean & compile contracts                                          |
| `npm run test`    | Execute TypeScript test-suite                                      |
| `npm run fork`    | Start a local Hardhat node (optionally forking)                    |
| `npm run slither` | Static analysis using [Slither](https://github.com/crytic/slither) |
| `npm run lint`    | Lint Solidity with Solhint                                         |
| `npm run format`  | Auto-format using Prettier                                         |

### 👷🏽 Hardhat Tasks

- **Deploy Collection**:
    ```bash
    npx hardhat deploy-collection --network <network>
    ```
- **Deploy Market**:
    ```bash
    npx hardhat deploy-market --network <network>
    ```
- **Deploy Individual Implementations**:
    ```bash
    npx hardhat deploy-art-token-impl --network <network>
    npx hardhat deploy-auction-house-impl --network <network>
    npx hardhat deploy-market-impl --network <network>
    ```
- **Verify Contracts on Etherscan**:
    ```bash
    npx hardhat verify-art-token --network <network>
    npx hardhat verify-auction-house --network <network>
    npx hardhat verify-market --network <network>
    ```

To see a full list of available tasks, run `npx hardhat --help`.

## 🛡️ Static Analysis

To run Slither for smart contract security analysis, you need to set up a Python virtual environment first:

```bash
# 1. Create a virtual environment
python3 -m venv venv

# 2. Activate the virtual environment
source venv/bin/activate

# 3. Install Python dependencies (including slither-analyzer)
pip install -r requirements.txt

# 4. Compile contracts
npm run compile

# 5. Run Slither analysis
npm run slither
```

The Slither configuration is defined in `slither.config.json`. After running, you can deactivate the virtual environment with:

```bash
deactivate
```

## 📜 License

Licensed under **GPL-3.0** – see [LICENSE](./LICENSE) for details.
