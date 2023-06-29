import { ethers } from 'hardhat';
import { expect } from 'chai';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { setNextBlockTimestamp } from '@nomicfoundation/hardhat-network-helpers/dist/src/helpers/time';
import { DOCollection, TransferCheckerMock } from '../typechain-types';
import { deployClassic } from '../scripts/deploy-classic';

describe('DOCollection', function () {
    let collection: DOCollection;
    let transferCheckerMock: TransferCheckerMock;

    let owner: SignerWithAddress;
    let minter: SignerWithAddress;
    let tokenOwner: SignerWithAddress;
    let tokenReceiver: SignerWithAddress;
    let randomAccount: SignerWithAddress;

    before(async () => {
        [owner, minter, tokenOwner, tokenReceiver, randomAccount] = <SignerWithAddress[]>(
            await ethers.getSigners()
        );
    });

    beforeEach(async () => {
        const _transferCheckerMock = await deployClassic({
            contractName: 'TransferCheckerMock',
            constructorArgs: [],
        });

        const _collection = await deployClassic({
            contractName: 'DOCollection',
            constructorArgs: [minter.address, _transferCheckerMock.address],
            signer: owner,
        });

        transferCheckerMock = <TransferCheckerMock>_transferCheckerMock;
        collection = <DOCollection>_collection;

        collection = collection.connect(owner);
    });

    it(`should have right minter`, async () => {
        await expect(collection['minter()']()).to.eventually.equal(minter.address);
    });

    it(`should have right transfer checker`, async () => {
        await expect(collection['transferChecker()']()).to.eventually.equal(
            transferCheckerMock.address
        );
    });

    it(`owner can change minter`, async () => {
        const _minter = '0x0000000000000000000000000000000000000001';

        await collection['minter(address)'](_minter);

        await expect(collection['minter()']()).to.eventually.equal(_minter);
    });

    it(`owner can change transfer checker`, async () => {
        const _transferChecker = {
            address: '0x0000000000000000000000000000000000000001',
        };

        await collection['transferChecker(address)'](_transferChecker.address);

        await expect(collection['transferChecker()']()).to.eventually.equal(
            _transferChecker.address
        );
    });

    it(`random account can't change minter`, async () => {
        const _minter = '0x0000000000000000000000000000000000000001';

        collection = collection.connect(randomAccount);

        await expect(collection['minter(address)'](_minter)).to.be.rejectedWith(
            'Ownable: caller is not the owner'
        );
    });

    it(`random account can't change transfer checker`, async () => {
        const _transferChecker = {
            address: '0x0000000000000000000000000000000000000001',
        };

        collection = collection.connect(randomAccount);

        await expect(
            collection['transferChecker(address)'](_transferChecker.address)
        ).to.be.rejectedWith('Ownable: caller is not the owner');
    });

    describe(`method 'mint'`, () => {
        const tokenId = 123;
        const tokenUri = 'some-uri';

        beforeEach(async () => {
            collection = collection.connect(minter);
        });

        it(`should mint token if caller is minter and transfer checking passes`, async () => {
            await transferCheckerMock['shouldPass(bool)'](true);

            await collection.mint(tokenOwner.address, tokenId, tokenUri);

            await Promise.all([
                expect(collection.ownerOf(tokenId)).to.eventually.equal(tokenOwner.address),
                expect(collection.tokenURI(tokenId)).to.eventually.equal(tokenUri),
                expect(collection.balanceOf(tokenOwner.address)).to.eventually.equal(1),
            ]);
        });

        it(`should set token creation date`, async () => {
            const tx = await collection.mint(tokenOwner.address, tokenId, tokenUri);
            const block = await ethers.provider.getBlock(tx.blockNumber!);

            await expect(collection.tokenCreationDate(tokenId)).to.eventually.equal(
                block.timestamp
            );
        });

        it(`should fail if caller isn't minter`, async () => {
            collection = collection.connect(randomAccount);

            await expect(
                collection.mint(randomAccount.address, tokenId, tokenUri)
            ).to.be.rejectedWith('DOCollection: caller is not the minter');
        });

        it(`should fail if transfer checking fails`, async () => {
            await transferCheckerMock['shouldPass(bool)'](false);

            await expect(collection.mint(tokenOwner.address, tokenId, tokenUri)).to.be.rejectedWith(
                'TransferCheckerMock: failed'
            );
        });
    });

    describe(`method 'safeMint'`, () => {
        const tokenId = 123;
        const tokenUri = 'some-uri';

        beforeEach(async () => {
            collection = collection.connect(minter);
        });

        it(`should mint token if caller is minter and transfer checking passes`, async () => {
            await transferCheckerMock['shouldPass(bool)'](true);

            await collection.safeMint(tokenOwner.address, tokenId, tokenUri, []);

            await Promise.all([
                expect(collection.ownerOf(tokenId)).to.eventually.equal(tokenOwner.address),
                expect(collection.tokenURI(tokenId)).to.eventually.equal(tokenUri),
                expect(collection.balanceOf(tokenOwner.address)).to.eventually.equal(1),
            ]);
        });

        it(`should fail if caller isn't minter`, async () => {
            collection = collection.connect(randomAccount);

            await expect(
                collection.safeMint(randomAccount.address, tokenId, tokenUri, [])
            ).to.be.rejectedWith('DOCollection: caller is not the minter');
        });

        it(`should fail if transfer checking fails`, async () => {
            await transferCheckerMock['shouldPass(bool)'](false);

            await expect(
                collection.safeMint(tokenOwner.address, tokenId, tokenUri, [])
            ).to.be.rejectedWith('TransferCheckerMock: failed');
        });
    });

    describe(`method 'transferFrom'`, () => {
        const tokenId = 123;
        const tokenUri = 'some-uri';

        beforeEach(async () => {
            await collection.connect(minter).mint(tokenOwner.address, tokenId, tokenUri);

            collection = collection.connect(tokenOwner);
        });

        it(`should transfer if transfer checking passes`, async () => {
            await transferCheckerMock['shouldPass(bool)'](true);

            await collection.transferFrom(tokenOwner.address, tokenReceiver.address, tokenId);

            await expect(collection.ownerOf(tokenId)).to.eventually.equal(tokenReceiver.address);
        });

        it(`should fail if transfer checking fails`, async () => {
            await transferCheckerMock['shouldPass(bool)'](false);

            await expect(
                collection.transferFrom(tokenOwner.address, tokenReceiver.address, tokenId)
            ).to.be.rejectedWith('TransferCheckerMock: failed');
        });
    });

    describe(`method 'burn'`, () => {
        const tokenId = 123;
        const tokenUri = 'some-uri';

        beforeEach(async () => {
            await collection.connect(minter).mint(tokenOwner.address, tokenId, tokenUri);
        });

        it(`should burn if caller is owner & token was created less than 7 days ago`, async () => {
            const block = await ethers.provider.getBlock('latest');

            const lessThan7days = 60 * 60 * 24 * 6; // 6 days in seconds

            setNextBlockTimestamp(block.timestamp + lessThan7days);

            await collection.burn(tokenId);

            await expect(collection.ownerOf(tokenId)).to.rejectedWith('ERC721: invalid token ID');
        });

        it(`should fail if token was created more than 7 days ago`, async () => {
            const block = await ethers.provider.getBlock('latest');

            const moreThan7days = 60 * 60 * 24 * 8; // 8 days in seconds

            setNextBlockTimestamp(block.timestamp + moreThan7days);

            await expect(collection.burn(tokenId)).to.rejectedWith(
                'DOCollection: token can not be burned'
            );
        });

        it(`should fail caller isn't owner`, async () => {
            await expect(collection.connect(randomAccount).burn(tokenId)).to.rejectedWith(
                'Ownable: caller is not the owner'
            );
        });
    });
});
