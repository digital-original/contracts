import { expect } from 'chai';
import { TOKEN_NAME, TOKEN_SYMBOL } from '../constants/token';
import { ZERO_BYTES } from './utils/constants';
import { deployMarketMock } from './utils/deploy-market-mock';
import { deployTokenUpgradeable } from './utils/deploy-token-upgradeable';
import { getSigners } from './utils/get-signers';
import { MarketMock, Token } from '../typechain-types';
import { AddressParam, Signer } from '../types/environment';

describe('Token', function () {
    let token: Token;

    let minter: Signer, minterAddr: string;
    let tokenOwner: Signer, tokenOwnerAddr: string;
    let tokenReceiver: Signer, tokenReceiverAddr: string;
    let randomAccount: Signer, randomAccountAddr: string;

    let marketMock: MarketMock, marketMockAddr: string;
    let auctionMock: MarketMock, auctionMockAddr: string;
    let randomMarketMock: MarketMock, randomMarketMockAddr: string;

    const tokenIdMock = 0;
    const tokenUriMock = 'ipfs://Q...';

    function safeMint(params: { to: AddressParam; _token?: Token }) {
        const { to, _token = token } = params;

        return _token.safeMint(to, tokenIdMock, tokenUriMock, ZERO_BYTES);
    }

    function safeTransferFrom(params: { from: AddressParam; to: AddressParam; _token?: Token }) {
        const { from, to, _token = token } = params;

        return _token['safeTransferFrom(address,address,uint256,bytes)'](
            from,
            to,
            tokenIdMock,
            ZERO_BYTES,
        );
    }

    function rollback(params: { _token?: Token } = {}) {
        const { _token = token } = params;

        return _token.rollback(tokenIdMock);
    }

    before(async () => {
        [
            [minter, tokenOwner, tokenReceiver, randomAccount],
            [minterAddr, tokenOwnerAddr, tokenReceiverAddr, randomAccountAddr],
        ] = await getSigners();

        [marketMock, marketMockAddr] = await deployMarketMock();
        [auctionMock, auctionMockAddr] = await deployMarketMock();
        [randomMarketMock, randomMarketMockAddr] = await deployMarketMock();
    });

    beforeEach(async () => {
        [token] = await deployTokenUpgradeable(minter, marketMock, auctionMock);

        token = token.connect(minter);
    });

    it(`should have right minter`, async () => {
        await expect(token.MINTER()).to.eventually.equal(minterAddr);
    });

    it(`should have right market`, async () => {
        await expect(token.MARKET()).to.eventually.equal(marketMockAddr);
    });

    it(`should have right auction`, async () => {
        await expect(token.AUCTION()).to.eventually.equal(auctionMockAddr);
    });

    it(`should have right name`, async () => {
        await Promise.all([
            expect(token.TOKEN_NAME()).to.eventually.equal(TOKEN_NAME),
            expect(token.name()).to.eventually.equal(TOKEN_NAME),
        ]);
    });

    it(`should have right symbol`, async () => {
        await Promise.all([
            expect(token.TOKEN_SYMBOL()).to.eventually.equal(TOKEN_SYMBOL),
            expect(token.symbol()).to.eventually.equal(TOKEN_SYMBOL),
        ]);
    });

    describe(`method 'safeMint'`, () => {
        it(`should mint if caller is minter`, async () => {
            await safeMint({ to: tokenOwner });

            await Promise.all([
                expect(token.ownerOf(tokenIdMock)).to.eventually.equal(tokenOwnerAddr),
                expect(token.tokenURI(tokenIdMock)).to.eventually.equal(tokenUriMock),
                expect(token.balanceOf(tokenOwner)).to.eventually.equal(1n),
            ]);
        });

        it(`should mint for trusted market if caller is minter`, async () => {
            await safeMint({ to: marketMock });

            await Promise.all([
                expect(token.ownerOf(tokenIdMock)).to.eventually.equal(marketMockAddr),
                expect(token.balanceOf(marketMock)).to.eventually.equal(1n),
            ]);
        });

        it(`should mint for trusted auction if caller is minter`, async () => {
            await safeMint({ to: auctionMock });

            await Promise.all([
                expect(token.ownerOf(tokenIdMock)).to.eventually.equal(auctionMockAddr),
                expect(token.balanceOf(auctionMock)).to.eventually.equal(1n),
            ]);
        });

        it(`should fail if caller is not minter`, async () => {
            const _token = token.connect(randomAccount);

            await expect(safeMint({ _token, to: randomAccount })).to.be.rejectedWith(
                'TokenUnauthorizedAccount',
            );
        });

        it(`should fail if receiver is not trusted contract`, async () => {
            await expect(safeMint({ to: randomMarketMock })).to.be.rejectedWith(
                'NotTrustedReceiver',
            );
        });
    });

    describe(`method 'safeTransferFrom'`, () => {
        beforeEach(async () => {
            await safeMint({ to: tokenOwner });

            token = token.connect(tokenOwner);
        });

        it(`should transfer to EOA`, async () => {
            await safeTransferFrom({ from: tokenOwner, to: tokenReceiver });

            await expect(token.ownerOf(tokenIdMock)).to.eventually.equal(tokenReceiverAddr);
        });

        it(`should transfer to trusted market`, async () => {
            await safeTransferFrom({ from: tokenOwner, to: marketMock });

            await expect(token.ownerOf(tokenIdMock)).to.eventually.equal(marketMockAddr);
        });

        it(`should transfer to trusted auction`, async () => {
            await safeTransferFrom({ from: tokenOwner, to: auctionMock });

            await expect(token.ownerOf(tokenIdMock)).to.eventually.equal(auctionMockAddr);
        });

        it(`should fail if receiver is not trusted contract`, async () => {
            await expect(
                safeTransferFrom({ from: tokenOwner, to: randomMarketMock }),
            ).to.be.rejectedWith('NotTrustedReceiver');
        });
    });

    describe(`method 'rollback'`, () => {
        beforeEach(async () => {
            await safeMint({ to: tokenOwner });
        });

        it(`should burn if caller is minter`, async () => {
            await rollback();

            await expect(token.ownerOf(tokenIdMock)).to.rejectedWith('ERC721NonexistentToken');
        });

        it(`should fail if caller is not minter`, async () => {
            const _token = token.connect(randomAccount);

            await expect(rollback({ _token })).to.rejectedWith('TokenUnauthorizedAccount');
        });
    });
});
