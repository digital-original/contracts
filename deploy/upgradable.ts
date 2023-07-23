import { ethers, network } from 'hardhat';
import { deployUpgradeable } from '../scripts/deploy-upgradable';
import { verify } from '../scripts/verify';

const CONTRACT_NAME = '';
const PROXY_ADMIN_ADDRESS = String(process.env.PROXY_ADMIN_LOCAL_DEV);
const CONSTRUCTOR_ARGS: any[] = [];
const INITIALIZE_ARGS: any[] = [];
const PATH_TO_CONTRACT = `contracts/${CONTRACT_NAME}.sol:${CONTRACT_NAME}`;

async function main() {
    const [deployer] = await ethers.getSigners();

    console.log(`Deploying ${CONTRACT_NAME} Upgradeable Contract...\n`);

    const { impl, proxy, implName, proxyName, proxyArgs, initializeTx } = await deployUpgradeable({
        contractName: CONTRACT_NAME,
        proxyAdminAddress: PROXY_ADMIN_ADDRESS,
        constructorArgs: CONSTRUCTOR_ARGS,
        initializeArgs: INITIALIZE_ARGS,
        signer: deployer,
    });

    // prettier-ignore
    console.log(JSON.stringify({
        implName,
        implAddress: impl.address,
        implArgs: CONSTRUCTOR_ARGS,
        proxyName,
        proxyAddress: proxy.address,
        proxyArgs,
        proxyAdminAddress: PROXY_ADMIN_ADDRESS,
        initializeTxHash: initializeTx.hash,
        initializeArgs: INITIALIZE_ARGS,
    }, null, 2));
    console.log(`\n${CONTRACT_NAME} Upgradeable Contract Deployed\n`);

    if (!['hardhat', 'local'].includes(network.name)) {
        // need to wait several block while etherscan process deploy transaction
        console.log('Waiting confirmations...');
        await proxy.deployTransaction.wait(3);

        await verify(PATH_TO_CONTRACT, impl.address, CONSTRUCTOR_ARGS);
        await verify(`contracts/proxy/${CONTRACT_NAME}.sol:${proxyName}`, proxy.address, proxyArgs);
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
