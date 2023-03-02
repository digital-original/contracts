import { run } from 'hardhat';

export async function verify(contract: string, address: string, constructorArguments: any[]) {
    console.log('Verifying contract...');

    try {
        await run('verify:verify', {
            contract,
            address,
            constructorArguments,
        });
    } catch (e: any) {
        if (e.message.toLowerCase().includes('already verified')) {
            console.log('Already Verified!');
        } else {
            console.error(e);
        }
    }
}
