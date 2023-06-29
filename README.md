# DO Smart Contracts

# [Docs](https://do-contracts-docs.netlify.app/)

## Sepolia Network
<!-- TOTO: Upload new contracts -->
- Faucet - <https://sepolia-faucet.pk910.de/>
- DOProxyAdmin - <https://sepolia.etherscan.io/address/0x77d3e2FAF8afEB827Db827116F1bF7dd14260D15>

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

### Run fuzz tests

1.
```
$ yarn run est
```
2.
```
$ echidna-test /src/test/fuzz/MarketFuzz.sol --contract MarketFuzz --config /src/.echidna.yml
```

### Run Slither-Analyzer

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
### Generate Documentation

```
$ forge doc -b
```
