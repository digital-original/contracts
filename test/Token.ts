import { ethers } from 'hardhat';
import type { Signer } from 'ethers';
import { expect } from 'chai';
import { setNextBlockTimestamp } from '@nomicfoundation/hardhat-network-helpers/dist/src/helpers/time';
import { MarketMock, Token } from '../typechain-types';
import { deployClassic } from '../src/scripts/deploy-classic';

describe('Token', function () {
    let token: Token;

    let marketMock: MarketMock;

    let deployer: Signer;
    let owner: Signer;
    let minter: Signer;
    let tokenOwner: Signer;
    let tokenReceiver: Signer;
    let randomAccount: Signer;

    before(async () => {
        [deployer, owner, minter, tokenOwner, tokenReceiver, randomAccount] =
            await ethers.getSigners();
    });

    beforeEach(async () => {
        const _marketMock = await deployClassic({
            name: 'MarketMock',
            constructorArgs: [],
        });

        marketMock = <any>_marketMock;

        const _token = await deployClassic({
            name: 'Token',
            constructorArgs: [owner, minter, marketMock],
        });

        token = <any>_token;
    });

    it(`should have right minter`, async () => {
        const expected = await minter.getAddress();

        await expect(token.MINTER()).to.eventually.equal(expected);
    });

    it(`should have right market`, async () => {
        const expected = await marketMock.getAddress();

        await expect(token.MARKET()).to.eventually.equal(expected);
    });

    describe(`method 'mint'`, () => {
        const tokenId = 123;
        const tokenUri = 'some-uri';

        beforeEach(async () => {
            token = token.connect(minter);
        });

        it(`should mint token if caller is minter`, async () => {
            await token.mint(tokenOwner, tokenId, tokenUri);

            const tokenOwnerAddress = await tokenOwner.getAddress();

            await Promise.all([
                expect(token.ownerOf(tokenId)).to.eventually.equal(tokenOwnerAddress),
                expect(token.tokenURI(tokenId)).to.eventually.equal(tokenUri),
                expect(token.balanceOf(tokenOwner)).to.eventually.equal(1n),
            ]);
        });

        it(`should set token creation date`, async () => {
            const tx = await token.mint(tokenOwner, tokenId, tokenUri);
            const block = await ethers.provider.getBlock(tx.blockNumber!);

            await expect(token.tokenCreationDate(tokenId)).to.eventually.equal(block!.timestamp);
        });

        it(`should fail if caller isn't minter`, async () => {
            token = token.connect(randomAccount);

            await expect(token.mint(randomAccount, tokenId, tokenUri)).to.be.rejectedWith(
                'TokenUnauthorizedAccount',
            );
        });

        it(`should fail if receiver is not trusted contract`, async () => {
            const randomMarket = await deployClassic({
                name: 'MarketMock',
                constructorArgs: [],
            });

            await expect(token.mint(randomMarket, tokenId, tokenUri)).to.be.rejectedWith(
                'NotTrustedReceiver',
            );
        });
    });

    describe(`method 'safeMint'`, () => {
        const tokenId = 123;
        const tokenUri = 'some-uri';

        beforeEach(async () => {
            token = token.connect(minter);
        });

        it(`should mint token if caller is minter`, async () => {
            await token.safeMint(tokenOwner, tokenId, tokenUri, new Uint8Array(0));

            const tokenOwnerAddress = await tokenOwner.getAddress();

            await Promise.all([
                expect(token.ownerOf(tokenId)).to.eventually.equal(tokenOwnerAddress),
                expect(token.tokenURI(tokenId)).to.eventually.equal(tokenUri),
                expect(token.balanceOf(tokenOwner)).to.eventually.equal(1n),
            ]);
        });

        it(`should set token creation date`, async () => {
            const tx = await token.safeMint(tokenOwner, tokenId, tokenUri, new Uint8Array(0));
            const block = await ethers.provider.getBlock(tx.blockNumber!);

            await expect(token.tokenCreationDate(tokenId)).to.eventually.equal(block!.timestamp);
        });

        it(`should fail if caller isn't minter`, async () => {
            token = token.connect(randomAccount);

            await expect(
                token.safeMint(randomAccount, tokenId, tokenUri, new Uint8Array(0)),
            ).to.be.rejectedWith('TokenUnauthorizedAccount');
        });

        it(`should fail if receiver is not trusted contract`, async () => {
            const randomMarket = await deployClassic({
                name: 'MarketMock',
                constructorArgs: [],
            });

            await expect(
                token.safeMint(randomMarket, tokenId, tokenUri, new Uint8Array(0)),
            ).to.be.rejectedWith('NotTrustedReceiver');
        });
    });

    describe(`method 'transferFrom'`, () => {
        const tokenId = 123;
        const tokenUri = 'some-uri';

        beforeEach(async () => {
            await token.connect(minter).mint(tokenOwner, tokenId, tokenUri);

            token = token.connect(tokenOwner);
        });

        it(`should transfer to EOA`, async () => {
            await token.transferFrom(tokenOwner, tokenReceiver, tokenId);

            const tokenReceiverAddress = await tokenReceiver.getAddress();

            await expect(token.ownerOf(tokenId)).to.eventually.equal(tokenReceiverAddress);
        });

        it(`should transfer to trusted contract`, async () => {
            await token.transferFrom(tokenOwner, marketMock, tokenId);

            const tokenReceiverAddress = await marketMock.getAddress();

            await expect(token.ownerOf(tokenId)).to.eventually.equal(tokenReceiverAddress);
        });

        it(`should fail if receiver is not trusted contract`, async () => {
            const randomMarket = await deployClassic({
                name: 'MarketMock',
                constructorArgs: [],
            });

            await expect(token.transferFrom(tokenOwner, randomMarket, tokenId)).to.be.rejectedWith(
                'NotTrustedReceiver',
            );
        });
    });

    describe(`method 'rollback'`, () => {
        const tokenId = 123;
        const tokenUri = 'some-uri';

        beforeEach(async () => {
            await token.connect(minter).mint(tokenOwner, tokenId, tokenUri);
        });

        it(`should burn if caller is owner and token was created less than 7 days ago`, async () => {
            const block = await ethers.provider.getBlock('latest');

            const lessThan7days = 60 * 60 * 24 * 6; // 6 days in seconds

            setNextBlockTimestamp(block!.timestamp + lessThan7days);

            await token.connect(owner).rollback(tokenId);

            await expect(token.ownerOf(tokenId)).to.rejectedWith('ERC721NonexistentToken');
        });

        it(`should fail if token was created more than 7 days ago`, async () => {
            const block = await ethers.provider.getBlock('latest');

            const moreThan7days = 60 * 60 * 24 * 8; // 8 days in seconds

            setNextBlockTimestamp(block!.timestamp + moreThan7days);

            await expect(token.connect(owner).rollback(tokenId)).to.rejectedWith(
                'TokenCannotBeBurned',
            );
        });

        it(`should fail caller isn't owner`, async () => {
            await expect(token.connect(randomAccount).rollback(tokenId)).to.rejectedWith(
                'OwnableUnauthorizedAccount',
            );
        });
    });
});
