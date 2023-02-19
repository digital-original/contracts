import { ethers, run } from 'hardhat';

async function main() {
    const currentTimestampInSeconds = Math.round(Date.now() / 1000);
    const ONE_YEAR_IN_SECS = 365 * 24 * 60 * 60;
    const unlockTime = currentTimestampInSeconds + ONE_YEAR_IN_SECS;

    const lockedAmount = ethers.utils.parseEther('0.00000000001');

    const Lock = await ethers.getContractFactory('Lock');
    const lock = await Lock.deploy(unlockTime, { value: lockedAmount });

    await lock.deployed();

    console.log(
        `Lock with 0.00000000001 ETH and unlock timestamp ${unlockTime} deployed to ${lock.address}`
    );

    await lock.deployTransaction.wait(3);

    await verify(lock.address, [unlockTime]);
}

async function verify(contractAddress: string, constructorArguments: any[]) {
    console.log('Verifying contract...');
    try {
        await run('verify:verify', {
            address: contractAddress,
            constructorArguments,
        });
    } catch (e: any) {
        if (e.message.toLowerCase().includes('already verified')) {
            console.log('Already Verified!');
        } else {
            console.log(e);
        }
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
