# Digital Original Smart Contracts
The repository contains two core smart contracts: [`ArtToken`](https://github.com/digital-original/contracts/blob/master/contracts/art-token/ArtToken.sol) and [`AuctionHouse`](https://github.com/digital-original/contracts/blob/master/contracts/auction-house/AuctionHouse.sol). Development takes place in the [Hardhat](https://hardhat.org/) environment, utilizing [OpenZeppelin](https://www.openzeppelin.com/) as the main smart contract library.

### ArtToken
Upgradable contract. The contract provides functionality to track, transfer and sell Digital Original NFTs.

### AuctionHouse
Upgradable contract. The contract provides functionality to sell Digital Original NFTs according to auction rules.

## Get Started
1. Install dependencies
```
$ npm install
```
2. Fill out `config.yaml`
3. Compile contracts
```
$ npm run compile
```

## Run test
```
$ npm run test
```

## Run local fork
```
$ npm run fork
```

## Run scripts
```
$ npx hardhat run <path-to-script> --network fork
```

## Deploy protocol
```
$ npx hardhat deploy-protocol --network fork
```

## Run slither
1. Create Python virtual environment
```
$ python3 -m venv venv
```
2. Run Python virtual environment
```
$ source ./venv/bin/activate
```
3. Instal Python packages
```
$ pip install -r requirements.txt
```
4. Run Slither
```
$ npm run slither
```

## Generate Documentation
```
$ forge doc -b
```
