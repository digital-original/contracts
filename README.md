![solidity](https://img.shields.io/badge/solidity-0.8.20-363636)
![openzeppelin](https://img.shields.io/badge/built%20with-OpenZeppelin-brightgreen)
![hardhat](https://img.shields.io/badge/built%20with-Hardhat-blueviolet)
![tests](https://github.com/digital-original/contracts/actions/workflows/test.yml/badge.svg)
![license](https://img.shields.io/badge/license-GPLv3-blue)

# Digital Original – Smart-Contracts Suite

Digital Original (DO) is a modular on-chain framework for managing primary sales and secondary markets of digital collectibles (NFTs).
This repository hosts all **Solidity smart-contracts, tests and tooling** required to deploy and operate the protocol.

## 📚 Contracts

### ArtToken
The `ArtToken` contract is an upgradeable ERC-721 NFT implementation that serves as the core collectible in the Digital Original ecosystem. Key features:

- **Primary Sales**: Supports direct minting and purchasing through the `buy()` function with built-in revenue distribution
- **EIP-712 Permits**: All primary sales require cryptographic authorization from designated signers
- **Compliance & Regulation**: Optional transfer restrictions for regulated collections
- **AuctionHouse Integration**: Works seamlessly with the AuctionHouse for auction-based primary sales
- **Revenue Splitting**: Automatic distribution of sale proceeds among multiple participants according to predefined shares

### AuctionHouse
The `AuctionHouse` contract manages English-style auctions for primary NFT sales. Key features:

- **Auction Creation**: Authorized creation of time-bound auctions with EIP-712 signatures
- **Bidding System**: Progressive bidding with minimum raise steps and automatic refunds to outbid participants
- **USDC Integration**: All bids and settlements are conducted in USDC for stable pricing

### Market
The `Market` contract facilitates peer-to-peer secondary trading of NFTs through off-chain order matching. Key features:

- **Order Types**: Supports both sell-side (ask) and buy-side (bid) orders
- **Off-chain Orders**: Gas-efficient trading through EIP-712 signed orders executed on-chain
- **Multi-Currency**: Configurable support for multiple ERC-20 payment currencies
- **Order Management**: Order invalidation capabilities for makers and admins
- **Fee Structure**: Flexible fee system supporting both maker and taker fees
- **Revenue Sharing**: Built-in mechanism for distributing fees among multiple participants
- **Security**: Time-bound orders with replay protection and signature verification

## 🗂 Repository Layout

```
contracts/           Solidity sources
├─ art-token/         ▸ `ArtToken` and base logic
├─ auction-house/     ▸ `AuctionHouse` contracts
├─ market/            ▸ `Market` and order libs
├─ utils/             ▸  Shared libraries & helpers
tests/                Hardhat unit tests (TypeScript)
scripts/              Re-usable deployment scripts
tasks/                Hardhat CLI tasks (`npx hardhat <task>`)
abis/                 Pre-generated ABIs
```

## ⚡️ Quick Start

```bash
# 1. install deps
npm install

# 2. copy environment templates and adjust values
cp config.env.example.yaml config.env.yaml

# 3. compile
npm run compile

# 4. run the tests
npm run test
```

### Local fork

Spin up a mainnet-fork (uses `config.env.yaml` for URL):

```bash
npm run fork
# in another terminal you can deploy the collection
npx hardhat deploy-collection --network fork
```

## 🔧 Configuration Files

* `config.env.yaml` – chain URLs, private keys, API keys (never commit real secrets)
* `config.do.yaml` / `config.dn.yaml` – collection parameters
* `config.market.yaml` – market parameters

Every Hardhat network entry gets enriched with a `protocolConfig` object at runtime, see `hardhat.config.ts`.

## 🛠 NPM Scripts

| Script | Description |
| ------ | ----------- |
| `npm run compile` | Clean & compile contracts |
| `npm run test` | Execute TypeScript test-suite |
| `npm run fork` | Start a local Hardhat node (optionally forking) |
| `npm run slither` | Static analysis using [Slither](https://github.com/crytic/slither) |
| `npm run lint` | Lint Solidity with Solhint |
| `npm run format` | Auto-format using Prettier |

## 🛡️ Slither Static Analysis

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

## 🤖 Hardhat Tasks

```bash
# Deploy collection (ArtToken + AuctionHouse proxies)
npx hardhat deploy-collection --network <network>

# Deploy individual implementations
npx hardhat deploy-art-token-impl --network <network>
npx hardhat deploy-auction-house-impl --network <network>
npx hardhat deploy-market-impl --network <network>

# Deploy Market proxy
npx hardhat deploy-market --network <network>

# Verify on Etherscan
npx hardhat verify-art-token --network <network>
npx hardhat verify-auction-house --network <network>
npx hardhat verify-market --network <network>
```

Run `npx hardhat --help` to list all available tasks.

## 📜 License

Licensed under **GPL-3.0** – see [LICENSE](./LICENSE) for details.
