import { expect } from 'chai';
import { setNextBlockTimestamp } from '@nomicfoundation/hardhat-network-helpers/dist/src/helpers/time';
import { ART_TOKEN_NAME, ART_TOKEN_SYMBOL } from '../constants/art-token';
import { ZERO_BYTES } from './utils/constants';
import { deployMarketMock } from './utils/deploy-market-mock';
import { deployArtTokenUpgradeable } from './utils/deploy-art-token-upgradeable';
import { getSigners } from './utils/get-signers';
import { MarketMock, ArtToken } from '../typechain-types';
import { AddressParam, Signer } from '../types/environment';
import { signBuyPermit } from './utils/sign-buy-permit';
import { getChainId } from './utils/get-chain-id';
import { BuyPermitStruct } from '../types/art-token';
import { MAX_TOTAL_SHARE } from '../constants/distribution';
import { getSignDeadline } from './utils/get-sign-deadline';

describe('ArtToken', function () {
    let token: ArtToken, tokenAddr: string;

    let chainId: number;

    let minter: Signer, minterAddr: string;
    let platform: Signer, platformAddr: string;
    let partner: Signer, partnerAddr: string;
    let tokenOwner: Signer, tokenOwnerAddr: string;
    let tokenReceiver: Signer, tokenReceiverAddr: string;
    let randomAccount1: Signer, randomAccount1Addr: string;
    let randomAccount2: Signer, randomAccount2Addr: string;

    let marketMock: MarketMock, marketMockAddr: string;
    let auctionMock: MarketMock, auctionMockAddr: string;
    let randomMarketMock: MarketMock, randomMarketMockAddr: string;

    const tokenId = 0;
    const tokenUriMock = 'ipfs://Q...';

    function safeMint(params: { to: AddressParam; _token?: ArtToken }) {
        const { to, _token = token } = params;

        return _token.safeMint(to, tokenId, tokenUriMock, ZERO_BYTES);
    }

    before(async () => {
        chainId = await getChainId();

        [
            [minter, platform, partner, tokenOwner, tokenReceiver, randomAccount1, randomAccount2],
            [
                minterAddr,
                platformAddr,
                partnerAddr,
                tokenOwnerAddr,
                tokenReceiverAddr,
                randomAccount1Addr,
                randomAccount2Addr,
            ],
        ] = await getSigners();

        [marketMock, marketMockAddr] = await deployMarketMock();
        [auctionMock, auctionMockAddr] = await deployMarketMock();
        [randomMarketMock, randomMarketMockAddr] = await deployMarketMock();
    });

    beforeEach(async () => {
        [token, tokenAddr] = await deployArtTokenUpgradeable(minter, marketMock, auctionMock);

        token = token.connect(minter);
    });

    it(`should have right minter`, async () => {
        await expect(token.MINTER()).to.eventually.equal(minterAddr);
    });

    it(`should have right market`, async () => {
        await expect(token.MARKET()).to.eventually.equal(marketMockAddr);
    });

    it(`should have right auction`, async () => {
        await expect(token.AUCTION_HOUSE()).to.eventually.equal(auctionMockAddr);
    });

    it(`should have right name`, async () => {
        await expect(token.name()).to.eventually.equal(ART_TOKEN_NAME);
    });

    it(`should have right symbol`, async () => {
        await expect(token.symbol()).to.eventually.equal(ART_TOKEN_SYMBOL);
    });

    describe(`method 'safeMint'`, () => {
        it(`should mint if caller is minter`, async () => {
            await safeMint({ to: tokenOwner });

            await Promise.all([
                expect(token.ownerOf(tokenId)).to.eventually.equal(tokenOwnerAddr),
                expect(token.tokenURI(tokenId)).to.eventually.equal(tokenUriMock),
                expect(token.balanceOf(tokenOwner)).to.eventually.equal(1n),
            ]);
        });

        it(`should mint for trusted market if caller is minter`, async () => {
            await safeMint({ to: marketMock });

            await Promise.all([
                expect(token.ownerOf(tokenId)).to.eventually.equal(marketMockAddr),
                expect(token.balanceOf(marketMock)).to.eventually.equal(1n),
            ]);
        });

        it(`should mint for trusted auction if caller is minter`, async () => {
            await safeMint({ to: auctionMock });

            await Promise.all([
                expect(token.ownerOf(tokenId)).to.eventually.equal(auctionMockAddr),
                expect(token.balanceOf(auctionMock)).to.eventually.equal(1n),
            ]);
        });

        it(`should fail if caller is not minter`, async () => {
            const _token = token.connect(randomAccount1);

            await expect(safeMint({ _token, to: randomAccount1 })).to.be.rejectedWith(
                'ArtTokenUnauthorizedAccount',
            );
        });

        it(`should fail if receiver is not trusted contract`, async () => {
            await expect(safeMint({ to: randomMarketMock })).to.be.rejectedWith(
                'NotTrustedReceiver',
            );
        });
    });

    describe(`method 'buy'`, () => {
        let price: bigint;
        let participants: string[];
        let shares: bigint[];
        let deadline: number;

        async function buy(params: {
            _to: string;
            _tokenId?: number;
            _tokenUri?: string;
            _price?: bigint;
            _participants?: string[];
            _shares?: bigint[];
            _deadline?: number;
            _value?: bigint;
            _minter?: Signer;
            _token?: ArtToken;
        }) {
            const {
                _to,
                _tokenId = tokenId,
                _tokenUri = tokenUriMock,
                _price = price,
                _participants = participants,
                _shares = shares,
                _deadline = deadline,
                _value = price,
                _minter = minter,
                _token = token,
            } = params;

            const permit: BuyPermitStruct = {
                to: _to,
                tokenId: _tokenId,
                tokenURI: _tokenUri,
                price: _price,
                participants: _participants,
                shares: _shares,
                deadline: _deadline,
            };

            const signature = await signBuyPermit(chainId, tokenAddr, permit, _minter);

            return _token.buy(
                _to,
                _tokenId,
                _price,
                _deadline,
                _tokenUri,
                _participants,
                _shares,
                signature,
                { value: _value },
            );
        }

        beforeEach(async () => {
            price = 5123430n;
            participants = [platformAddr, partnerAddr];
            shares = [MAX_TOTAL_SHARE / 5n, (MAX_TOTAL_SHARE / 5n) * 4n];
            deadline = await getSignDeadline();
        });

        it(`should mint token if all conditions are met`, async () => {
            const _to = randomAccount1Addr;
            const _token = token.connect(randomAccount1);

            await buy({
                _to,
                _token,
            });

            await Promise.all([
                expect(token.ownerOf(tokenId)).to.eventually.equal(_to),
                expect(token.tokenURI(tokenId)).to.eventually.equal(tokenUriMock),
                expect(token.balanceOf(_to)).to.eventually.equal(1n),
            ]);
        });

        it(`should fail if permit signer is not minter`, async () => {
            const _to = randomAccount1Addr;
            const _minter = randomAccount1;
            const _token = token.connect(randomAccount1);

            await Promise.all([
                expect(
                    buy({
                        _to,
                        _minter,
                        _token,
                    }),
                ).to.be.rejectedWith('EIP712InvalidSignature'),
            ]);
        });

        it(`should fail if permit is expired`, async () => {
            const _to = randomAccount1Addr;
            const _deadline = await getSignDeadline();
            const _token = token.connect(randomAccount1);

            await setNextBlockTimestamp(_deadline + 10);

            await Promise.all([
                expect(
                    buy({
                        _to,
                        _deadline,
                        _token,
                    }),
                ).to.be.rejectedWith('EIP712ExpiredSignature'),
            ]);
        });

        it(`should fail if insufficient payment`, async () => {
            const _to = randomAccount1Addr;
            const _price = price;
            const _token = token.connect(randomAccount1);

            await Promise.all([
                expect(
                    buy({
                        _to,
                        _price,
                        _value: _price - 1n,
                        _token,
                    }),
                ).to.be.rejectedWith('ArtTokenInsufficientPayment'),
            ]);
        });

        it(`should fail if 'to' in permit and caller are different`, async () => {
            const _to = randomAccount1Addr;
            const _token = token.connect(randomAccount2);

            await Promise.all([
                expect(
                    buy({
                        _to,
                        _token,
                    }),
                ).to.be.rejectedWith('ArtTokenUnauthorizedAccount'),
            ]);
        });

        it(`should distribute reward between participants according to shares`, async () => {
            const _to = randomAccount1Addr;
            const _token = token.connect(randomAccount1);

            await expect(() =>
                buy({
                    _to,
                    _token,
                }),
            ).to.be.changeEtherBalances(
                [_to, ...participants],
                [price * -1n, ...shares.map((share) => (price * share) / MAX_TOTAL_SHARE)],
            );
        });

        it(`should fail if number of shares is not equal number of participants`, async () => {
            const _to = randomAccount1Addr;
            const _participants = [platformAddr];
            const _shares = [MAX_TOTAL_SHARE / 2n, MAX_TOTAL_SHARE / 2n];
            const _token = token.connect(randomAccount1);

            await expect(
                buy({
                    _to,
                    _token,
                    _participants,
                    _shares,
                }),
            ).to.be.rejectedWith('DistributionInvalidSharesCount');
        });

        it(`should fail if total shares is not equal maximum total share`, async () => {
            const _to = randomAccount1Addr;
            const _participants = [platformAddr, partnerAddr];
            const _shares = [MAX_TOTAL_SHARE, 1n];
            const _token = token.connect(randomAccount1);

            await expect(
                buy({
                    _to,
                    _token,
                    _participants,
                    _shares,
                }),
            ).to.be.rejectedWith('DistributionInvalidSharesSum');
        });

        it(`should fail if shares and participants are empty`, async () => {
            const _to = randomAccount1Addr;
            const _participants: string[] = [];
            const _shares: bigint[] = [];
            const _token = token.connect(randomAccount1);

            await expect(
                buy({
                    _to,
                    _token,
                    _participants,
                    _shares,
                }),
            ).to.be.rejectedWith('DistributionInvalidSharesSum');
        });
    });

    describe(`method 'safeTransferFrom'`, () => {
        function safeTransferFrom(params: {
            from: AddressParam;
            to: AddressParam;
            _token?: ArtToken;
        }) {
            const { from, to, _token = token } = params;

            return _token['safeTransferFrom(address,address,uint256,bytes)'](
                from,
                to,
                tokenId,
                ZERO_BYTES,
            );
        }

        beforeEach(async () => {
            await safeMint({ to: tokenOwner });

            token = token.connect(tokenOwner);
        });

        it(`should transfer to EOA`, async () => {
            await safeTransferFrom({ from: tokenOwner, to: tokenReceiver });

            await expect(token.ownerOf(tokenId)).to.eventually.equal(tokenReceiverAddr);
        });

        it(`should transfer to trusted market`, async () => {
            await safeTransferFrom({ from: tokenOwner, to: marketMock });

            await expect(token.ownerOf(tokenId)).to.eventually.equal(marketMockAddr);
        });

        it(`should transfer to trusted auction`, async () => {
            await safeTransferFrom({ from: tokenOwner, to: auctionMock });

            await expect(token.ownerOf(tokenId)).to.eventually.equal(auctionMockAddr);
        });

        it(`should fail if receiver is not trusted contract`, async () => {
            await expect(
                safeTransferFrom({ from: tokenOwner, to: randomMarketMock }),
            ).to.be.rejectedWith('NotTrustedReceiver');
        });
    });

    describe(`method 'rollback'`, () => {
        function rollback(params: { _token?: ArtToken } = {}) {
            const { _token = token } = params;

            return _token.rollback(tokenId);
        }

        beforeEach(async () => {
            await safeMint({ to: tokenOwner });
        });

        it(`should burn if caller is minter`, async () => {
            await rollback();

            await expect(token.ownerOf(tokenId)).to.be.rejectedWith('ERC721NonexistentToken');
        });

        it(`should fail if caller is not minter`, async () => {
            const _token = token.connect(randomAccount1);

            await expect(rollback({ _token })).to.be.rejectedWith('ArtTokenUnauthorizedAccount');
        });
    });
});
