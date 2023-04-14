# DO Smart Contracts

# [Docs](https://do-contracts-docs.netlify.app/)

## Sepolia Network
- Faucet - <https://sepolia-faucet.pk910.de/>
- DOProxyAdmin - <https://sepolia.etherscan.io/address/0x77d3e2FAF8afEB827Db827116F1bF7dd14260D15>
- WhiteList
    - Proxy - <https://sepolia.etherscan.io/address/0xc192D054535C1308E410389A4020dCC4C9721a42>
    - Impl - <https://sepolia.etherscan.io/address/0x017af7846dc328E5148905C74182c24218e6f150>
- DOCollection - <https://sepolia.etherscan.io/address/0x282eB0B11C5771B991e2acf4fFA38bE678C7baD6>

## Get Started

### Install dependencies
```
$ yarn install
```

### Run local node
```
$ yarn run node
```

### Run test
```
$ yarn run test
```

### Run test on local node
```
$ yarn run test --network local
```

### Run scripts
```
$ yarn hardhat run <path-to-script>
```

### Run scripts on testnet
```
$ yarn hardhat run <path-to-script> --network sepolia
```

### Deploy upgradable-contract to testnet

_Set CONTRACT_NAME and INITIALIZE_ARGS at the top of deploy/upgradable.ts file_

```
$ yarn run deploy:upgradable --network sepolia
```

## Run fuzz tests

1.
```
$ yarn run est
```
2.
```
$ echidna-test /src/test/fuzz/MarketFuzz.sol --contract MarketFuzz --config /src/.echidna.yml
```

## Run Slither-Analyzer

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
$ yarn run slither
```
