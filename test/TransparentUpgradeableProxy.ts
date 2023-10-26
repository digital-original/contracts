import { ethers } from 'hardhat';
import type { Signer } from 'ethers';
import { expect } from 'chai';
import { ImplV1Mock, ImplV2Mock, ProxyAdmin } from '../typechain-types';
import { deployUpgrade } from '../src/scripts/deploy-upgrade';
import { deployUpgradeable } from '../src/scripts/deploy-upgradable';

describe('TransparentUpgradeableProxy', function () {
    let proxy: ImplV1Mock | ImplV2Mock;
    let proxyAdmin: ProxyAdmin;

    let deployer: Signer;
    let proxyAdminOwner: Signer;

    before(async () => {
        [deployer, proxyAdminOwner] = await ethers.getSigners();
    });

    beforeEach(async () => {
        const { proxyAdmin: _proxyAdmin, proxyWithImpl: _proxy } = await deployUpgradeable({
            implName: 'ImplV1Mock',
            proxyAdminOwner: proxyAdminOwner,
            deployer: deployer,
        });

        proxy = <any>_proxy;
        proxyAdmin = <any>_proxyAdmin;
    });

    it(`should based on the V1 implementation`, async () => {
        expect(await proxy.count()).equal(0n);

        await proxy.increment();

        expect(await proxy.count()).equal(1n);
    });

    it(`should upgrade implementation to the V2`, async () => {
        await deployUpgrade({
            implName: 'ImplV2Mock',
            proxyAdminAddress: proxyAdmin,
            proxyAddress: proxy,
            deployer: proxyAdminOwner,
        });

        expect(await proxy.count()).equal(0n);

        await proxy.increment();

        expect(await proxy.count()).equal(2n);
    });
});
