import { ethers } from 'hardhat';
import { expect } from 'chai';
import { deployUpgrade } from '../scripts/deploy-upgrade';
import { deployUpgradeable } from '../scripts/deploy-upgradeable';
import { getSigners } from './utils/get-signers';
import { getProxyAdmin } from './utils/get-proxy-admin';
import { Signer } from '../types/environment';
import { ImplV1Mock, ImplV2Mock, ProxyAdmin } from '../typechain-types';

describe('TransparentUpgradeableProxy', function () {
    let proxy: ImplV1Mock | ImplV2Mock;
    let proxyAdmin: ProxyAdmin;

    let proxyAdminOwner: Signer;

    before(async () => {
        [[proxyAdminOwner]] = await getSigners();
    });

    beforeEach(async () => {
        const { proxy: _proxy } = await deployUpgradeable({
            implName: 'ImplV1Mock',
            proxyAdminOwnerAddr: proxyAdminOwner,
            implConstructorArgs: [],
        });

        proxy = await ethers.getContractAt('ImplV1Mock', _proxy);
        [proxyAdmin] = await getProxyAdmin(_proxy);
    });

    it(`should based on the V1 implementation`, async () => {
        expect(await proxy.count()).equal(0n);

        await proxy.increment();

        expect(await proxy.count()).equal(1n);
    });

    it(`should upgrade implementation to the V2`, async () => {
        await deployUpgrade({
            implName: 'ImplV2Mock',
            implConstructorArgs: [],
            proxyAdminAddr: proxyAdmin,
            proxyAddr: proxy,
            proxyAdminOwner,
        });

        expect(await proxy.count()).equal(0n);

        await proxy.increment();

        expect(await proxy.count()).equal(2n);
    });
});
