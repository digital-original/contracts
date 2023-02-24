# DO Smart Contracts


## Sepolia Network
- Faucet - https://sepolia-faucet.pk910.de/
- DOProxyAdmin - https://sepolia.etherscan.io/address/0x77d3e2FAF8afEB827Db827116F1bF7dd14260D15#code

## Contracts
- WhiteList — upgradable-contract for storing verified accounts, a contract owner can add and remove accounts, anyone can check the whitelist.


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
$ yarn hardhat <path-to-script>
```

### Run scripts on testnet
```
$ yarn hardhat <path-to-script> --network sepolia
```

### Deploy upgradable-contract to testnet

_Set CONTRACT_NAME and INITIALIZE_ARGS at the top of deploy/upgradable.ts file_

```
$ yarn hardhat deploy/upgradable.ts --network sepolia
```
