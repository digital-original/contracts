import { network, run } from 'hardhat';
import { Contract } from 'ethers';

const LOCAL_NETWORKS = ['hardhat', 'fork'];

export async function _verify(
    contract: Contract,
    path: string,
    address: string,
    constructorArgs: any[],
) {
    if (LOCAL_NETWORKS.includes(network.name)) {
        return;
    }

    console.log(`\n`);
    console.log(`Verifying ${path}...`);
    console.log(`\n`);
    // need to wait for several confirmations while etherscan processes the deployment transaction
    console.log('Waiting confirmations...');
    console.log(`\n`);

    await contract.deploymentTransaction()?.wait(5);

    try {
        await run('verify:verify', {
            contract: path,
            address,
            constructorArguments: constructorArgs,
        });
    } catch (e: any) {
        if (e.message.toLowerCase().includes('already verified')) {
            console.log('Already Verified!');
        } else {
            console.error(e);
        }
    }
}
