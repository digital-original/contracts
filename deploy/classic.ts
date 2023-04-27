import { ethers, network } from 'hardhat';
import { deployClassic } from '../scripts/deploy-classic';
import { verify } from '../scripts/verify';

const CONTRACT_NAME = 'DOCollection';
const CONSTRUCTOR_ARGS: any[] = [
    'Digital Original',
    'DO',
    '0xc192D054535C1308E410389A4020dCC4C9721a42',
];
const PATH_TO_CONTRACT = `contracts/${CONTRACT_NAME}.sol:${CONTRACT_NAME}`;

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
    console.log(`\n${CONTRACT_NAME} Contract Deployed\n`);

    if (!['hardhat', 'local'].includes(network.name)) {
        // need to wait several confirmations while etherscan process deploy transaction
        console.log('Waiting confirmations...');
        await contract.deployTransaction.wait(3);

        await verify(PATH_TO_CONTRACT, contract.address, CONSTRUCTOR_ARGS);
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
