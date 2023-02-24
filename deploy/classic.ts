import { ethers, network } from 'hardhat';
import { deployClassic } from '../scripts/deploy-classic';
import { verify } from '../scripts/verify';

const CONTRACT_NAME = 'DOProxyAdmin';
const CONSTRUCTOR_ARGS: any = [];

async function main() {
    const [deployer] = await ethers.getSigners();

    console.log(`Deploying ${CONTRACT_NAME} Contract...\n`);

    const contract = await deployClassic({
        contractName: CONTRACT_NAME,
        constructorArgs: CONSTRUCTOR_ARGS,
        signer: deployer,
    });

    // prettier-ignore
    console.log(JSON.stringify({
        contractName: CONTRACT_NAME,
        constructorArgs: CONSTRUCTOR_ARGS,
        contractAddress: contract.address,
    }, null, 2));
    console.log(`\n${CONTRACT_NAME} Upgradeable Contract Deployed\n`);

    if (!['hardhat', 'local'].includes(network.name)) {
        // need to wait several confirmations while etherscan process deploy transaction
        console.log('Waiting confirmations...');
        await contract.deployTransaction.wait(3);

        await verify(contract.address, CONSTRUCTOR_ARGS);
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
