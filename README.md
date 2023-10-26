# DO Smart Contracts

# [Docs](https://do-contracts-docs.netlify.app/)

## Sepolia Network
- Faucet - <https://sepolia-faucet.pk910.de/>

#### Dev
- Contract
    - Token - [0x7A9A971F612655bDA4cb2e35938bEB7280A39F93](https://sepolia.etherscan.io/address/0x7A9A971F612655bDA4cb2e35938bEB7280A39F93)
    - TransferChecker - [0x62C3c7Dd9DB2D6B8680db0c1c0816f8ed9757BF4](https://sepolia.etherscan.io/address/0x62C3c7Dd9DB2D6B8680db0c1c0816f8ed9757BF4)
    - Market - [0xaF09116DB64c636AD4C3b156939742B577C28bC1](https://sepolia.etherscan.io/address/0xaF09116DB64c636AD4C3b156939742B577C28bC1)
- EOA
    - ProxyAdminOwner - [0xc5fA4C1e0289092e615B28b9B54B3117a0294516](https://sepolia.etherscan.io/address/0xc5fA4C1e0289092e615B28b9B54B3117a0294516)
    - Minter - [0x009F3d0e79E3C11E1786e3Fe42eCD64abf321037](https://sepolia.etherscan.io/address/0x009F3d0e79E3C11E1786e3Fe42eCD64abf321037)
    - MarketSigner - [0x542375626624D813B87817C4982900E9d3d28685](https://sepolia.etherscan.io/address/0x542375626624D813B87817C4982900E9d3d28685)

## Get Started

### Run local node
```
$ npm run node
```

### Run test
```
$ npm run test
```

### Run test on local node
```
$ npm run test --network fork
```

### Run scripts
```
$ npm hardhat run <path-to-script>
```

### Run scripts on testnet
```
$ npm hardhat run <path-to-script> --network sepolia
```

### Deploy upgradable-contract to testnet

_Set CONTRACT_NAME and INITIALIZE_ARGS at the top of deploy/upgradable.ts file_

```
$ npm run deploy:upgradable -- --network sepolia
```

### Run fuzz tests

1.
```
$ npm run est
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
$ npm run slither
```
### Generate Documentation

```
$ forge doc -b
```
