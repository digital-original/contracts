import { ethers } from 'hardhat';
import chai, { expect, assert } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { deployUpgradeable } from '../scripts/deploy-upgradable';
import { DOCollection, WhiteList } from '../typechain-types';
import { deployClassic } from '../scripts/deploy-classic';

chai.use(chaiAsPromised);

describe('DOCollection', function () {
    let collection: DOCollection;
    let whiteList: WhiteList;
    let owner: SignerWithAddress;
    let randomAccount1: SignerWithAddress;
    let randomAccount2: SignerWithAddress;

    const collectionName = 'Digital Original';
    const collectionSymbol = 'Digital Original';

    before(async () => {
        [owner, randomAccount1, randomAccount2] = <SignerWithAddress[]>await ethers.getSigners();
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
        const [name, symbol] = await Promise.all([collection.name(), collection.symbol()]);

        expect(name).equal(collectionName);
        expect(symbol).equal(collectionSymbol);
    });

    it(`should have right whitelist`, async () => {
        const _whiteList = await collection['whiteList()']();

        expect(_whiteList).equal(whiteList.address);
    });

    it(`owner can change whitelist`, async () => {
        const { proxyWithImpl: _whiteList } = await deployUpgradeable({
            contractName: 'WhiteList',
            proxyAdminAddress: '0x0000000000000000000000000000000000000001',
            initializeArgs: [],
            signer: owner,
        });

        await collection['whiteList(address)'](_whiteList.address);

        expect(collection['whiteList()']()).to.eventually.equal(_whiteList.address);
    });

    it(`random account can't change whitelist`, async () => {
        const { proxyWithImpl: _whiteList } = await deployUpgradeable({
            contractName: 'WhiteList',
            proxyAdminAddress: '0x0000000000000000000000000000000000000001',
            initializeArgs: [],
            signer: randomAccount1,
        });

        collection = collection.connect(randomAccount1);

        await expect(collection['whiteList(address)'](_whiteList.address)).to.be.rejectedWith(
            'Ownable: caller is not the owner'
        );
    });

    it(`random account can't mint token`, async () => {
        const to = randomAccount1.address;
        const tokenId = 123;
        const tokenUri = 'some-uri';

        collection = collection.connect(randomAccount1);

        expect(collection.mint(to, tokenId, tokenUri)).to.be.rejectedWith(
            'Ownable: caller is not the owner'
        );
    });

    it(`owner can't mint token if account isn't whitelisted`, async () => {
        const to = randomAccount1.address;
        const tokenId = 123;
        const tokenUri = 'some-uri';

        assert(!(await whiteList.includes(to)));

        expect(collection.mint(to, tokenId, tokenUri)).to.be.rejectedWith(
            'DOCollection: Invalid receiver'
        );
    });

    it(`owner can mint token if account is whitelisted`, async () => {
        const to = randomAccount1.address;
        const tokenId = 123;
        const tokenUri = 'some-uri';

        await whiteList.add(to);
        await collection.mint(to, tokenId, tokenUri);

        await Promise.all([
            expect(collection.ownerOf(tokenId)).to.eventually.equal(to),
            expect(collection.tokenURI(tokenId)).to.eventually.equal(tokenUri),
            expect(collection.balanceOf(to)).to.eventually.equal(1),
        ]);
    });

    it(`token owner can't transfer token if receiver isn't whitelisted`, async () => {
        const tokenOwner = randomAccount1;
        const tokenReceiver = randomAccount2;
        const tokenId = 123;
        const tokenUri = 'some-uri';

        await whiteList.add(tokenOwner.address);
        await collection.mint(tokenOwner.address, tokenId, tokenUri);

        collection = collection.connect(tokenOwner);

        assert(!(await whiteList.includes(tokenReceiver.address)));

        await expect(
            collection.transferFrom(tokenOwner.address, tokenReceiver.address, tokenId)
        ).to.be.rejectedWith('DOCollection: Invalid receiver');
    });

    it(`token owner can transfer token if receiver is whitelisted`, async () => {
        const tokenOwner = randomAccount1;
        const tokenReceiver = randomAccount2;
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
