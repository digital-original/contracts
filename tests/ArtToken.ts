import { expect } from 'chai';
import { setNextBlockTimestamp } from '@nomicfoundation/hardhat-network-helpers/dist/src/helpers/time';
import { ART_TOKEN_NAME, ART_TOKEN_SYMBOL } from '../constants/art-token';
import { ZERO_BYTES } from './utils/constants';
import { deployArtTokenUpgradeable } from './utils/deploy-art-token-upgradeable';
import { getSigners } from './utils/get-signers';
import { ArtToken, AuctionHouseMock, CollabTokenMock } from '../typechain-types';
import { AddressParam, Signer } from '../types/environment';
import { signBuyPermit } from './utils/sign-buy-permit';
import { getChainId } from './utils/get-chain-id';
import { BuyPermitStruct, CollabPermitStruct } from '../types/art-token';
import { MAX_TOTAL_SHARE } from '../constants/distribution';
import { getSigDeadline } from './utils/get-sig-deadline';
import { deployAuctionHouseMock } from './utils/deploy-auction-house-mock';
import { deployCollabTokenMock } from './utils/deploy-collab-token-mock';
import { ethers } from 'hardhat';
import { signCollabPermit } from './utils/sign-collab-permit';
import { getLatestBlockTimestamp } from './utils/get-latest-block-timestamp';

describe('ArtToken', function () {
    let token: ArtToken, tokenAddr: string;

    let chainId: number;

    let minter: Signer, minterAddr: string;
    let platform: Signer, platformAddr: string;
    let partner: Signer, partnerAddr: string;
    let tokenOwner: Signer, tokenOwnerAddr: string;
    let tokenReceiver: Signer, tokenReceiverAddr: string;
    let randomAccount: Signer, randomAccountAddr: string;

    let auctionHouseMock: AuctionHouseMock, auctionHouseMockAddr: string;
    let collabTokenMock: CollabTokenMock, collabTokenMockAddr: string;
    let randomContract: AuctionHouseMock, randomContractAddr: string;

    const tokenId = 0;
    const tokenUriMock = 'ipfs://Q...';

    function safeMint(params: { to: AddressParam; _token?: ArtToken }) {
        const { to, _token = token } = params;

        return _token.safeMint(to, tokenId, tokenUriMock, ZERO_BYTES);
    }

    before(async () => {
        chainId = await getChainId();

        [
            [minter, platform, partner, tokenOwner, tokenReceiver, randomAccount],
            [
                minterAddr,
                platformAddr,
                partnerAddr,
                tokenOwnerAddr,
                tokenReceiverAddr,
                randomAccountAddr,
            ],
        ] = await getSigners();

        [auctionHouseMock, auctionHouseMockAddr] = await deployAuctionHouseMock();
        [randomContract, randomContractAddr] = await deployAuctionHouseMock();
    });

    beforeEach(async () => {
        [collabTokenMock, collabTokenMockAddr] = await deployCollabTokenMock();

        [token, tokenAddr] = await deployArtTokenUpgradeable(
            minter,
            auctionHouseMock,
            collabTokenMock,
        );

        token = token.connect(minter);
    });

    it(`should have right minter`, async () => {
        await expect(token.MINTER()).to.eventually.equal(minterAddr);
    });

    it(`should have right auction house`, async () => {
        await expect(token.AUCTION_HOUSE()).to.eventually.equal(auctionHouseMockAddr);
    });

    it(`should have right collab token`, async () => {
        await expect(token.COLLAB_TOKEN()).to.eventually.equal(collabTokenMockAddr);
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

        it(`should mint for trusted auction if caller is minter`, async () => {
            await safeMint({ to: auctionHouseMock });

            await Promise.all([
                expect(token.ownerOf(tokenId)).to.eventually.equal(auctionHouseMockAddr),
                expect(token.balanceOf(auctionHouseMock)).to.eventually.equal(1n),
            ]);
        });

        it(`should fail if caller is not minter`, async () => {
            const _token = token.connect(randomAccount);

            await expect(safeMint({ _token, to: randomAccount })).to.be.rejectedWith(
                'ArtTokenUnauthorizedAccount',
            );
        });

        it(`should fail if receiver is not trusted contract`, async () => {
            await expect(safeMint({ to: randomContract })).to.be.rejectedWith(
                'ArtTokenNotTrustedReceiver',
            );
        });
    });

    describe(`method 'buy'`, () => {
        let price: bigint;
        let participants: string[];
        let shares: bigint[];
        let deadline: number;

        beforeEach(async () => {
            price = 5123430n;
            participants = [platformAddr, partnerAddr];
            shares = [MAX_TOTAL_SHARE / 5n, (MAX_TOTAL_SHARE / 5n) * 4n];
            deadline = await getSigDeadline();
        });

        it(`should mint token`, async () => {
            const _to = randomAccountAddr;
            const _token = token.connect(randomAccount);

            await buy({ _token });

            await Promise.all([
                expect(token.ownerOf(tokenId)).to.eventually.equal(_to),
                expect(token.tokenURI(tokenId)).to.eventually.equal(tokenUriMock),
                expect(token.balanceOf(_to)).to.eventually.equal(1n),
            ]);
        });

        it(`should fail if permit signer is not minter`, async () => {
            const _minter = randomAccount;
            const _token = token.connect(randomAccount);

            await Promise.all([
                expect(buy({ _minter, _token })).to.be.rejectedWith('EIP712InvalidSignature'),
            ]);
        });

        it(`should fail if permit is expired`, async () => {
            const _deadline = await getSigDeadline();
            const _token = token.connect(randomAccount);

            await setNextBlockTimestamp(_deadline + 10);

            await Promise.all([
                expect(buy({ _deadline, _token })).to.be.rejectedWith('EIP712ExpiredSignature'),
            ]);
        });

        it(`should fail if insufficient payment`, async () => {
            const _price = price;
            const _token = token.connect(randomAccount);

            await Promise.all([
                expect(
                    buy({
                        _price,
                        _value: _price - 1n,
                        _token,
                    }),
                ).to.be.rejectedWith('ArtTokenInsufficientPayment'),
            ]);
        });

        it(`should distribute reward between participants according to shares`, async () => {
            const _to = randomAccountAddr;
            const _token = token.connect(randomAccount);

            await expect(() => buy({ _token })).to.be.changeEtherBalances(
                [_to, ...participants],
                [price * -1n, ...shares.map((share) => (price * share) / MAX_TOTAL_SHARE)],
            );
        });

        it(`should fail if number of shares is not equal number of participants`, async () => {
            const _participants = [platformAddr];
            const _shares = [MAX_TOTAL_SHARE / 2n, MAX_TOTAL_SHARE / 2n];
            const _token = token.connect(randomAccount);

            await expect(
                buy({
                    _token,
                    _participants,
                    _shares,
                }),
            ).to.be.rejectedWith('DistributionInvalidSharesCount');
        });

        it(`should fail if total shares is not equal maximum total share`, async () => {
            const _participants = [platformAddr, partnerAddr];
            const _shares = [MAX_TOTAL_SHARE, 1n];
            const _token = token.connect(randomAccount);

            await expect(
                buy({
                    _token,
                    _participants,
                    _shares,
                }),
            ).to.be.rejectedWith('DistributionInvalidSharesSum');
        });

        it(`should fail if shares and participants are empty`, async () => {
            const _participants: string[] = [];
            const _shares: bigint[] = [];
            const _token = token.connect(randomAccount);

            await expect(
                buy({
                    _token,
                    _participants,
                    _shares,
                }),
            ).to.be.rejectedWith('DistributionInvalidSharesSum');
        });

        async function buy(params: {
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
                tokenId: _tokenId,
                tokenURI: _tokenUri,
                price: _price,
                participants: _participants,
                shares: _shares,
                deadline: _deadline,
            };

            const signature = await signBuyPermit(chainId, tokenAddr, permit, _minter);

            return _token.buy(
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
    });

    describe(`method 'safeTransferFrom'`, () => {
        beforeEach(async () => {
            await safeMint({ to: tokenOwner });

            token = token.connect(tokenOwner);
        });

        it(`should transfer to EOA`, async () => {
            await safeTransferFrom({ from: tokenOwner, to: tokenReceiver });

            await expect(token.ownerOf(tokenId)).to.eventually.equal(tokenReceiverAddr);
        });

        it(`should transfer to trusted auction`, async () => {
            await safeTransferFrom({ from: tokenOwner, to: auctionHouseMock });

            await expect(token.ownerOf(tokenId)).to.eventually.equal(auctionHouseMockAddr);
        });

        it(`should fail if receiver is not trusted contract`, async () => {
            await expect(
                safeTransferFrom({ from: tokenOwner, to: randomContract }),
            ).to.be.rejectedWith('NotTrustedReceiver');
        });

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
    });

    describe(`method 'rollback'`, () => {
        beforeEach(async () => {
            await safeMint({ to: tokenOwner });
        });

        it(`should burn if caller is minter`, async () => {
            await rollback();

            await expect(token.ownerOf(tokenId)).to.be.rejectedWith('ERC721NonexistentToken');
        });

        it(`should fail if caller is not minter`, async () => {
            const _token = token.connect(randomAccount);

            await expect(rollback({ _token })).to.be.rejectedWith('ArtTokenUnauthorizedAccount');
        });

        function rollback(params: { _token?: ArtToken } = {}) {
            const { _token = token } = params;

            return _token.rollback(tokenId);
        }
    });

    describe(`method 'collaborate'`, () => {
        const tokenId = 123n;
        const collabTokenId = tokenId;
        const guarantee = 1000n;
        const data = '0xff';

        beforeEach(() => {
            token = token.connect(partner);
        });

        it(`should mint token for particular address`, async () => {
            await expect(collaborate())
                .to.be.emit(token, 'Transfer')
                .withArgs(ethers.ZeroAddress, auctionHouseMockAddr, tokenId);
        });

        it(`should mint collab token for caller`, async () => {
            await collaborate();
            await expect(collabTokenMock.ownerOf(collabTokenId)).to.eventually.equal(partnerAddr);
        });

        it(`should transfer guarantee to collab token`, async () => {
            await expect(collaborate()).changeEtherBalances(
                [partner, collabTokenMock],
                [guarantee * -1n, guarantee],
            );
        });

        it(`should fail if insufficient guarantee`, async () => {
            await expect(collaborate({ _guarantee: guarantee - 1n })).to.eventually.rejectedWith(
                'ArtTokenInsufficientPayment',
            );
        });

        it(`should fail if permit signer is not minter`, async () => {
            await expect(collaborate({ _minter: randomAccount })).to.eventually.rejectedWith(
                'EIP712InvalidSignature',
            );
        });

        it(`should fail if permit is expired`, async () => {
            const _deadline = await getLatestBlockTimestamp();

            await expect(collaborate({ _deadline })).to.eventually.rejectedWith(
                'EIP712ExpiredSignature',
            );
        });

        async function collaborate(
            params: {
                _guarantee?: bigint;
                _deadline?: number;
                _minter?: Signer;
            } = {},
        ) {
            const { _guarantee = guarantee, _deadline, _minter = minter } = params;

            const deadline = _deadline || (await getSigDeadline());

            const permit: CollabPermitStruct = {
                tokenId,
                tokenURI: tokenUriMock,
                guarantee,
                deadline,
                data,
            };

            const signature = await signCollabPermit(chainId, tokenAddr, permit, _minter);

            return token.collaborate(tokenId, guarantee, deadline, tokenUriMock, data, signature, {
                value: _guarantee,
            });
        }
    });
});
