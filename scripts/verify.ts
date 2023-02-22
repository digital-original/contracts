import { run } from 'hardhat';

export async function verify(contractAddress: string, constructorArgs?: any[]) {
    console.log('Verifying contract...');

    try {
        await run('verify:verify', {
            address: contractAddress,
            constructorArguments: constructorArgs,
        });
    } catch (e: any) {
        if (e.message.toLowerCase().includes('already verified')) {
            console.log('Already Verified!');
        } else {
            console.log(e);
        }
    }
}
