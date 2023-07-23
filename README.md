# DO Smart Contracts

# [Docs](https://do-contracts-docs.netlify.app/)

## Sepolia Network
- Faucet - <https://sepolia-faucet.pk910.de/>
<!-- TODO: Update all deploy scripts -->
#### Dev
- DOCollection - [0x7A9A971F612655bDA4cb2e35938bEB7280A39F93](https://sepolia.etherscan.io/address/0x7A9A971F612655bDA4cb2e35938bEB7280A39F93)
- Minter - [0x009F3d0e79E3C11E1786e3Fe42eCD64abf321037](https://sepolia.etherscan.io/address/0x009F3d0e79E3C11E1786e3Fe42eCD64abf321037) (EOA)
- TransferChecker - [0x62C3c7Dd9DB2D6B8680db0c1c0816f8ed9757BF4](https://sepolia.etherscan.io/address/0x62C3c7Dd9DB2D6B8680db0c1c0816f8ed9757BF4)
- DOProxyAdmin - [0xbF8A14e15C3088ab4f4BBfbD67905b868522C3f9](https://sepolia.etherscan.io/address/0xbF8A14e15C3088ab4f4BBfbD67905b868522C3f9)
- DOProxyAdminOwner - [0xc5fA4C1e0289092e615B28b9B54B3117a0294516](https://sepolia.etherscan.io/address/0xc5fA4C1e0289092e615B28b9B54B3117a0294516) (EOA)
- MarketProxy - [0xaF09116DB64c636AD4C3b156939742B577C28bC1](https://sepolia.etherscan.io/address/0xaF09116DB64c636AD4C3b156939742B577C28bC1)
- MarketImpl - [0x341d363A4210005754A8777BC3A037F7aeFA3aae](https://sepolia.etherscan.io/address/0x341d363A4210005754A8777BC3A037F7aeFA3aae)
- MarketSigner - [0x542375626624D813B87817C4982900E9d3d28685](https://sepolia.etherscan.io/address/0x542375626624D813B87817C4982900E9d3d28685) (EOA)

#### Local
- DOCollection - [0xD7ADDF8c2E5da4F75BB67DB6968619afF6fCCBE0](https://sepolia.etherscan.io/address/0xD7ADDF8c2E5da4F75BB67DB6968619afF6fCCBE0)
- Minter - [0x10eeeda3b4c032d251b40559b6a8ddfb79fae052](https://sepolia.etherscan.io/address/0x10eeeda3b4c032d251b40559b6a8ddfb79fae052) (EOA)
- TransferChecker - [0x5FEaaBfFd3aeEd7457A1885A36e8506742620625](https://sepolia.etherscan.io/address/0x5FEaaBfFd3aeEd7457A1885A36e8506742620625)
- DOProxyAdmin - [0xbF8A14e15C3088ab4f4BBfbD67905b868522C3f9](https://sepolia.etherscan.io/address/0xbF8A14e15C3088ab4f4BBfbD67905b868522C3f9)
- DOProxyAdminOwner - [0xc5fA4C1e0289092e615B28b9B54B3117a0294516](https://sepolia.etherscan.io/address/0xc5fA4C1e0289092e615B28b9B54B3117a0294516) (EOA)
- MarketProxy - [0xc637929e8aB46800429926642F6e1FB8234f2c7f](https://sepolia.etherscan.io/address/0xc637929e8aB46800429926642F6e1FB8234f2c7f)
- MarketImpl - [0xcA006365382012C46b828bE03341A0509F8B7eff](https://sepolia.etherscan.io/address/0xcA006365382012C46b828bE03341A0509F8B7eff)
- MarketSigner - [0x9E4Abc28D61D76429b60B91cbC4C9F4E64832F34](https://sepolia.etherscan.io/address/0x9E4Abc28D61D76429b60B91cbC4C9F4E64832F34) (EOA)

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
