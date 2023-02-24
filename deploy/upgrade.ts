import { ethers, network } from 'hardhat';
import { deployUpgrade } from '../scripts/deploy-upgrade';
import { verify } from '../scripts/verify';

const CONTRACT_NAME = 'WhiteList';
const PROXY_ADDRESS = '0x0000000000000000000000000000000000000001';

const PROXY_ADMIN_ADDRESS = process.env.PROXY_ADMIN_ADDRESS!;

async function main() {
    const [deployer] = await ethers.getSigners();

    console.log(`Deploying ${CONTRACT_NAME} Contract Upgrade ...\n`);

    const { implName, impl, proxyName, upgradeTx } = await deployUpgrade({
        contractName: CONTRACT_NAME,
        proxyAddress: PROXY_ADDRESS,
        proxyAdminAddress: PROXY_ADMIN_ADDRESS,
        signer: deployer,
    });

    // prettier-ignore
    console.log(JSON.stringify({
        implName,
        implAddress: impl.address,
        proxyName,
        proxyAddress: PROXY_ADDRESS,
        proxyAdminAddress: PROXY_ADMIN_ADDRESS,
        upgradeTxHash: upgradeTx.hash,
    }, null, 2));
    console.log(`\n${CONTRACT_NAME} Contract Upgrade Deployed\n`);

    if (!['hardhat', 'local'].includes(network.name)) {
        // need to wait several block while etherscan process deploy transaction
        await impl.deployTransaction.wait(3);

        await verify(impl.address, []);
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
