![license](https://img.shields.io/badge/license-GPLv3-blue)
![hardhat](https://img.shields.io/badge/built%20with-Hardhat-blueviolet)
![solidity](https://img.shields.io/badge/solidity-0.8.20-363636)

# Digital Original Smart Contracts

The repository contains two core smart contracts: [`ArtToken`](https://github.com/digital-original/contracts/blob/master/contracts/art-token/ArtToken.sol) and [`AuctionHouse`](https://github.com/digital-original/contracts/blob/master/contracts/auction-house/AuctionHouse.sol). Development takes place in the [Hardhat](https://hardhat.org/) environment, utilizing [OpenZeppelin](https://www.openzeppelin.com/) as the main smart contract library.

## Project Description

### ArtToken
The `ArtToken` is an upgradable contract that provides functionality to track, transfer, and sell Digital Original NFTs. It ensures secure and efficient management of digital assets.

### AuctionHouse
The `AuctionHouse` is an upgradable contract that facilitates the sale of Digital Original NFTs according to auction rules.

## Setup Instructions

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment**
   Fill out the `config.env.yaml` file with the necessary configuration details.

3. **Compile Contracts**
   ```bash
   npm run compile
   ```

## Usage

### Run Tests
Execute the test suite to ensure all contracts function as expected.
```bash
npm run test
```

### Run Local Fork
Set up a local fork of the blockchain for testing and development.
```bash
npm run fork
```

### Run Scripts
Execute scripts using Hardhat.
```bash
npx hardhat run <path-to-script> --network fork
```

### Deploy Collection
Deploy the smart contracts to the specified network.
```bash
npx hardhat deploy-collection --network fork
```

### Run Slither
Perform static analysis using Slither.
1. Create a Python virtual environment:
   ```bash
   python3 -m venv venv
   ```
2. Activate the virtual environment:
   ```bash
   source ./venv/bin/activate
   ```
3. Install Python packages:
   ```bash
   pip install -r requirements.txt
   ```
4. Run Slither:
   ```bash
   npm run slither
   ```

## License

This project is licensed under the GNU General Public License v3.0. See the [LICENSE](./LICENSE) file for details.
