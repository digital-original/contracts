import { ethers } from 'hardhat';
import { expect } from 'chai';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { deployUpgradeable } from '../scripts/deploy-upgradable';
import { DOCollection, WhiteList } from '../typechain-types';
import { deployClassic } from '../scripts/deploy-classic';

describe('DOCollection', function () {
    let collection: DOCollection;
    let whiteList: WhiteList;
    let owner: SignerWithAddress;
    let tokenOwner: SignerWithAddress;
    let randomAccount: SignerWithAddress;
    let tokenReceiver: SignerWithAddress;

    const collectionName = 'Digital Original';
    const collectionSymbol = 'Digital Original';

    before(async () => {
        [owner, tokenOwner, tokenReceiver, randomAccount] = <SignerWithAddress[]>(
            await ethers.getSigners()
        );
    });

    beforeEach(async () => {
        const { proxyWithImpl: _whiteList } = await deployUpgradeable({
            contractName: 'WhiteList',
            proxyAdminAddress: '0x0000000000000000000000000000000000000001',
            initializeArgs: [],
            signer: owner,
        });

        whiteList = <WhiteList>_whiteList;
        whiteList = whiteList.connect(owner);

        const _collection = await deployClassic({
            contractName: 'DOCollection',
            constructorArgs: [collectionName, collectionSymbol, _whiteList.address],
            signer: owner,
        });

        collection = <DOCollection>_collection;
        collection = collection.connect(owner);
    });

    it(`should have right name and symbol`, async () => {
        await Promise.all([
            expect(collection.name()).to.eventually.equal(collectionName),
            expect(collection.symbol()).to.eventually.equal(collectionSymbol),
        ]);
    });

    it(`should have right whitelist`, async () => {
        await expect(collection['whiteList()']()).to.eventually.equal(whiteList.address);
    });

    it(`owner can change whitelist`, async () => {
        const _whiteList = await deployClassic({
            contractName: 'WhiteList',
            constructorArgs: [],
            signer: owner,
        });

        await collection['whiteList(address)'](_whiteList.address);

        await expect(collection['whiteList()']()).to.eventually.equal(_whiteList.address);
    });

    it(`random account can't change whitelist`, async () => {
        const _whiteList = await deployClassic({
            contractName: 'WhiteList',
            constructorArgs: [],
            signer: randomAccount,
        });

        collection = collection.connect(randomAccount);

        await expect(collection['whiteList(address)'](_whiteList.address)).to.be.rejectedWith(
            'Ownable: caller is not the owner'
        );
    });

    it(`random account can't mint token`, async () => {
        const tokenId = 123;
        const tokenUri = 'some-uri';

        collection = collection.connect(randomAccount);

        await expect(collection.mint(randomAccount.address, tokenId, tokenUri)).to.be.rejectedWith(
            'Ownable: caller is not the owner'
        );
    });

    it(`owner can't mint token if account isn't whitelisted`, async () => {
        const tokenId = 123;
        const tokenUri = 'some-uri';

        await expect(collection.mint(tokenReceiver.address, tokenId, tokenUri)).to.be.rejectedWith(
            'DOCollection: invalid receiver'
        );
    });

    it(`owner can mint token if account is whitelisted`, async () => {
        const tokenId = 123;
        const tokenUri = 'some-uri';

        await whiteList.add(tokenReceiver.address);
        await collection.mint(tokenReceiver.address, tokenId, tokenUri);

        await Promise.all([
            expect(collection.ownerOf(tokenId)).to.eventually.equal(tokenReceiver.address),
            expect(collection.tokenURI(tokenId)).to.eventually.equal(tokenUri),
            expect(collection.balanceOf(tokenReceiver.address)).to.eventually.equal(1),
        ]);
    });

    it(`token owner can't transfer token if receiver isn't whitelisted`, async () => {
        const tokenId = 123;
        const tokenUri = 'some-uri';

        await whiteList.add(tokenOwner.address);
        await collection.mint(tokenOwner.address, tokenId, tokenUri);

        collection = collection.connect(tokenOwner);

        await expect(
            collection.transferFrom(tokenOwner.address, tokenReceiver.address, tokenId)
        ).to.be.rejectedWith('DOCollection: invalid receiver');
    });

    it(`token owner can transfer token if receiver is whitelisted`, async () => {
        const tokenId = 123;
        const tokenUri = 'some-uri';

        await whiteList.add(tokenOwner.address);
        await whiteList.add(tokenReceiver.address);
        await collection.mint(tokenOwner.address, tokenId, tokenUri);

        collection = collection.connect(tokenOwner);

        await collection.transferFrom(tokenOwner.address, tokenReceiver.address, tokenId);

        await expect(collection.ownerOf(tokenId)).to.eventually.equal(tokenReceiver.address);
    });
});
