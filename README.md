# DO Smart Contracts

# [Docs](https://do-contracts-docs.netlify.app/)

## Sepolia Network
- Faucet - <https://sepolia-faucet.pk910.de/>

## Get Started

### Run local fork
```
$ npm run fork
```

### Run test
```
$ npm run test
```

### Run scripts
```
$ npx hardhat run <path-to-script> --network sepolia
```

### Run slither
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
