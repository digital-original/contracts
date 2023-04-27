import { ethers } from 'hardhat';
import { FormatTypes } from 'ethers/lib/utils';
import { expect } from 'chai';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { ImplV1Mock, ITransparentUpgradeableProxy } from '../typechain-types';
import { deployClassic } from '../scripts/deploy-classic';
import ITransparentUpgradeableProxyJSON from '../artifacts/@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol/ITransparentUpgradeableProxy.json';
import ImplV1MockJSON from '../artifacts/contracts/test/ImplV1Mock.sol/ImplV1Mock.json';

describe('TransparentUpgradeableProxy', function () {
    let proxy: ITransparentUpgradeableProxy & ImplV1Mock;
    let owner: SignerWithAddress;
    let proxyAdmin: SignerWithAddress;
    let randomAccount: SignerWithAddress;
    let implV1Address: string;

    before(async () => {
        [owner, proxyAdmin, randomAccount] = <SignerWithAddress[]>await ethers.getSigners();
    });

    beforeEach(async () => {
        const implV1 = await deployClassic({
            contractName: 'ImplV1Mock',
            constructorArgs: [],
            signer: owner,
        });

        const proxyContract = await deployClassic({
            contractName: 'TransparentUpgradeableProxy',
            constructorArgs: [implV1.address, proxyAdmin.address, []],
            signer: owner,
        });

        const proxyWithImpl = await ethers.getContractAt(
            [...ITransparentUpgradeableProxyJSON.abi, ...ImplV1MockJSON.abi],
            proxyContract.address
        );

        implV1Address = implV1.address;
        proxy = <ITransparentUpgradeableProxy & ImplV1Mock>proxyWithImpl;
        proxy = proxy.connect(proxyAdmin);
    });

    it(`Proxy is based on the V1 implementation`, async () => {
        expect(await proxy.callStatic.implementation()).equal(implV1Address);

        proxy = proxy.connect(randomAccount);

        expect(await proxy.count()).equal(0);

        await proxy.increment();

        expect(await proxy.count()).equal(1);
    });

    it(`ProxyAdmin can change implementation`, async () => {
        const implV2 = await deployClassic({
            contractName: 'ImplV2Mock',
            constructorArgs: [],
            signer: owner,
        });

        await proxy.connect(proxyAdmin).upgradeTo(implV2.address);

        expect(await proxy.callStatic.implementation()).equal(implV2.address);

        proxy = proxy.connect(randomAccount);

        expect(await proxy.count()).equal(0);

        await proxy.increment();

        expect(await proxy.count()).equal(2);
    });
});
