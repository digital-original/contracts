import { ethers } from 'hardhat';
import { expect } from 'chai';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { deployUpgradeable } from '../scripts/deploy-upgradable';
import { WhiteList } from '../typechain-types';

describe('WhiteList', function () {
    let whiteList: WhiteList;
    let owner: SignerWithAddress;
    let randomAccount: SignerWithAddress;

    before(async () => {
        [owner, randomAccount] = <SignerWithAddress[]>await ethers.getSigners();
    });

    beforeEach(async () => {
        const { proxyWithImpl } = await deployUpgradeable({
            contractName: 'WhiteList',
            proxyAdminAddress: '0x0000000000000000000000000000000000000001',
            initializeArgs: [],
            signer: owner,
        });

        whiteList = <WhiteList>proxyWithImpl;
        whiteList = whiteList.connect(owner);
    });

    it(`owner can add account to whitelist`, async () => {
        await whiteList.add(randomAccount.address);

        await expect(whiteList.includes(randomAccount.address)).to.eventually.equal(true);
    });

    it(`owner can't add account to whitelist if account already included`, async () => {
        await whiteList.add(randomAccount.address);

        await expect(whiteList.add(randomAccount.address)).to.be.rejectedWith(
            'WhiteList: account already included'
        );
    });

    it(`owner can remove account from whitelist`, async () => {
        await whiteList.add(randomAccount.address);
        await whiteList.remove(randomAccount.address);

        await expect(whiteList.includes(randomAccount.address)).to.eventually.equal(false);
    });

    it(`owner can't remove account from whitelist if account not included`, async () => {
        await expect(whiteList.remove(randomAccount.address)).to.be.rejectedWith(
            'WhiteList: account not included'
        );
    });

    it(`random account can't add account to whitelist`, async () => {
        whiteList = whiteList.connect(randomAccount);

        await expect(whiteList.add(randomAccount.address)).to.be.rejectedWith(
            'Ownable: caller is not the owner'
        );
    });

    it(`random account can't remove account from whitelist`, async () => {
        await whiteList.add(randomAccount.address);

        whiteList = whiteList.connect(randomAccount);

        await expect(whiteList.remove(randomAccount.address)).to.be.rejectedWith(
            'Ownable: caller is not the owner'
        );
    });
});
