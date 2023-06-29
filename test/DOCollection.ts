import { ethers } from 'hardhat';
import { expect } from 'chai';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { DOCollection, TransferCheckerMock } from '../typechain-types';
import { deployClassic } from '../scripts/deploy-classic';

describe.only('DOCollection', function () {
    let collection: DOCollection;
    let transferCheckerMock: TransferCheckerMock;
    let owner: SignerWithAddress;
    let tokenOwner: SignerWithAddress;
    let tokenReceiver: SignerWithAddress;
    let randomAccount: SignerWithAddress;

    before(async () => {
        [owner, tokenOwner, tokenReceiver, randomAccount] = <SignerWithAddress[]>(
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
            constructorArgs: [_transferCheckerMock.address],
            signer: owner,
        });

        transferCheckerMock = <TransferCheckerMock>_transferCheckerMock;
        collection = <DOCollection>_collection;

        collection = collection.connect(owner);
    });

    it(`should have right transfer checker`, async () => {
        await expect(collection['transferChecker()']()).to.eventually.equal(
            transferCheckerMock.address
        );
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

        it(`should mint token if caller is owner and transfer checking passes`, async () => {
            await transferCheckerMock['shouldPass(bool)'](true);

            await collection.mint(tokenOwner.address, tokenId, tokenUri);

            await Promise.all([
                expect(collection.ownerOf(tokenId)).to.eventually.equal(tokenOwner.address),
                expect(collection.tokenURI(tokenId)).to.eventually.equal(tokenUri),
                expect(collection.balanceOf(tokenOwner.address)).to.eventually.equal(1),
            ]);
        });

        it(`should fail if caller isn't owner`, async () => {
            collection = collection.connect(randomAccount);

            await expect(
                collection.mint(randomAccount.address, tokenId, tokenUri)
            ).to.be.rejectedWith('Ownable: caller is not the owner');
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

        it(`should mint token if caller is owner and transfer checking passes`, async () => {
            await transferCheckerMock['shouldPass(bool)'](true);

            await collection.safeMint(tokenOwner.address, tokenId, tokenUri, []);

            await Promise.all([
                expect(collection.ownerOf(tokenId)).to.eventually.equal(tokenOwner.address),
                expect(collection.tokenURI(tokenId)).to.eventually.equal(tokenUri),
                expect(collection.balanceOf(tokenOwner.address)).to.eventually.equal(1),
            ]);
        });

        it(`should fail if caller isn't owner`, async () => {
            collection = collection.connect(randomAccount);

            await expect(
                collection.safeMint(randomAccount.address, tokenId, tokenUri, [])
            ).to.be.rejectedWith('Ownable: caller is not the owner');
        });

        it(`should fail if transfer checking fails`, async () => {
            await transferCheckerMock['shouldPass(bool)'](false);

            await expect(
                collection.safeMint(tokenOwner.address, tokenId, tokenUri, [])
            ).to.be.rejectedWith('TransferCheckerMock: failed');
        });
    });

    describe('method `transferFrom`', () => {
        const tokenId = 123;
        const tokenUri = 'some-uri';

        beforeEach(async () => {
            await collection.mint(tokenOwner.address, tokenId, tokenUri);

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
});
