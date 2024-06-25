import { expect } from 'chai';
import { ethers } from 'hardhat';
import { getSigners } from './utils/get-signers';
import { ArtToken, AuctionHouse, USDC } from '../typechain-types';
import { Signer } from '../types/environment';
import { signBuyPermit } from './utils/sign-art-token-buy-permit';
import { getChainId } from './utils/get-chain-id';
import { BuyPermitStruct } from '../types/art-token';
import { TOTAL_SHARE } from '../constants/distribution';
import { getValidDeadline } from './utils/get-valid-deadline';
import { getLatestBlockTimestamp } from './utils/get-latest-block-timestamp';
import { deployContracts } from '../scripts/deploy-contracts';
import { deployUsdc } from './utils/deploy-usdc';
import { signCreatePermit } from './utils/sign-auction-house-create-permit';
import { CreatePermitStruct } from '../types/auction-house';

describe('ArtToken', function () {
    let artToken: ArtToken, artTokenAddr: string;
    let auctionHouse: AuctionHouse, auctionHouseAddr: string;
    let usdc: USDC, usdcAddr: string;

    let chainId: number;

    let proxyAdminOwner: Signer, proxyAdminOwnerAddr: string;
    let admin: Signer, adminAddr: string;
    let platform: Signer, platformAddr: string;
    let partner: Signer, partnerAddr: string;
    let buyer: Signer, buyerAddr: string;
    let randomAccount: Signer, randomAccountAddr: string;

    before(async () => {
        chainId = await getChainId();

        [usdc, usdcAddr] = await deployUsdc();

        [
            [proxyAdminOwner, admin, platform, partner, buyer, buyer, randomAccount],
            [
                proxyAdminOwnerAddr,
                adminAddr,
                platformAddr,
                partnerAddr,
                buyerAddr,
                buyerAddr,
                randomAccountAddr,
            ],
        ] = await getSigners();
    });

    beforeEach(async () => {
        const {
            artToken: _artToken,
            artTokenAddr: _artTokenAddr,
            auctionHouse: _auctionHouse,
            auctionHouseAddr: _auctionHouseAddr,
        } = await deployContracts({
            proxyAdminOwner,
            admin,
            platform,
            usdc,
            minAuctionDurationHours: 1,
        });

        await usdc.connect(buyer).mint();
        await usdc.connect(buyer).approve(_artToken, ethers.MaxInt256);

        artToken = _artToken.connect(buyer);
        artTokenAddr = _artTokenAddr;
        auctionHouse = _auctionHouse;
        auctionHouseAddr = _auctionHouseAddr;
    });

    describe(`method 'buy'`, () => {
        let tokenId: bigint;
        let tokenURI: string;
        let price: bigint;
        let fee: bigint;
        let participants: string[];
        let shares: bigint[];
        let deadline: number;

        beforeEach(async () => {
            tokenId = 0n;
            tokenURI = 'ipfs://Q...';
            price = 100_000_000n;
            fee = 100_000_000n;
            participants = [platformAddr, partnerAddr];
            shares = [TOTAL_SHARE / 5n, (TOTAL_SHARE / 5n) * 4n];
            deadline = await getValidDeadline();
        });

        it(`should mint token`, async () => {
            await buy();

            await Promise.all([
                expect(artToken.ownerOf(tokenId)).to.eventually.equal(buyerAddr),
                expect(artToken.tokenURI(tokenId)).to.eventually.equal(tokenURI),
                expect(artToken.balanceOf(buyer)).to.eventually.equal(1n),
            ]);
        });

        it(`should transfer fee to platform`, async () => {
            const transaction = await buy();

            await expect(transaction)
                .to.be.emit(usdc, 'Transfer')
                .withArgs(artTokenAddr, platformAddr, fee);
        });

        it(`should transfer price and fee from buyer to contract`, async () => {
            const transaction = await buy();

            await expect(transaction)
                .to.be.emit(usdc, 'Transfer')
                .withArgs(buyerAddr, artTokenAddr, price + fee);
        });

        it(`should fail if token is reserved by auction`, async () => {
            const createPermit: CreatePermitStruct = {
                auctionId: 1n,
                tokenId,
                tokenURI,
                price: 100_000_001n,
                fee: 100_000_001n,
                step: 1_000_001n,
                endTime: deadline,
                participants,
                shares,
                deadline,
            };

            const signature = await signCreatePermit(
                chainId,
                auctionHouseAddr,
                createPermit,
                admin,
            );

            await auctionHouse.create({
                auctionId: createPermit.auctionId,
                tokenId,
                tokenURI,
                price: createPermit.price,
                fee: createPermit.fee,
                step: createPermit.step,
                endTime: createPermit.endTime,
                participants,
                shares,
                signature,
                deadline,
            });

            await expect(buy()).to.be.rejectedWith('ArtTokenReserved');
        });

        describe(`permit logic`, () => {
            it(`should fail if permit signer is not admin`, async () => {
                const _admin = randomAccount;

                await expect(buy({ _admin })).to.be.rejectedWith('EIP712InvalidSignature');
            });

            it(`should fail if permit is expired`, async () => {
                const _deadline = await getLatestBlockTimestamp();

                await expect(buy({ _deadline })).to.be.rejectedWith('EIP712ExpiredSignature');
            });

            it(`should fail if the sender is invalid`, async () => {
                const _artToken = artToken.connect(randomAccount);

                await expect(buy({ _artToken })).to.be.rejectedWith('EIP712InvalidSignature');
            });
        });

        describe(`distribution logic`, () => {
            it(`should distribute reward between participants according to shares`, async () => {
                const transaction = await buy();

                expect(transaction)
                    .to.be.emit(usdc, 'Transfer')
                    .withArgs(artTokenAddr, participants[0], (price * shares[0]) / TOTAL_SHARE);
                expect(transaction)
                    .to.be.emit(usdc, 'Transfer')
                    .withArgs(artTokenAddr, participants[1], (price * shares[1]) / TOTAL_SHARE);
            });

            it(`should fail if number of shares is not equal number of participants`, async () => {
                const _participants = [platformAddr];
                const _shares = [TOTAL_SHARE / 2n, TOTAL_SHARE / 2n];

                await expect(buy({ _participants, _shares })).to.be.rejectedWith(
                    'DistributionInvalidSharesCount',
                );
            });

            it(`should fail if total shares is not equal TOTAL_SHARE`, async () => {
                const _participants = [platformAddr, partnerAddr];
                const _shares = [TOTAL_SHARE, 1n];

                await expect(buy({ _participants, _shares })).to.be.rejectedWith(
                    'DistributionInvalidSharesSum',
                );
            });

            it(`should fail if shares and participants are empty`, async () => {
                const _participants: string[] = [];
                const _shares: bigint[] = [];

                await expect(buy({ _participants, _shares })).to.be.rejectedWith(
                    'DistributionInvalidSharesSum',
                );
            });
        });

        async function buy(
            params: {
                _tokenId?: bigint;
                _tokenURI?: string;
                _sender?: string;
                _price?: bigint;
                _fee?: bigint;
                _participants?: string[];
                _shares?: bigint[];
                _deadline?: number;
                _admin?: Signer;
                _artToken?: ArtToken;
            } = {},
        ) {
            const {
                _tokenId = tokenId,
                _tokenURI = tokenURI,
                _sender = buyerAddr,
                _price = price,
                _fee = fee,
                _participants = participants,
                _shares = shares,
                _deadline = deadline,
                _admin = admin,
                _artToken = artToken,
            } = params;

            const permit: BuyPermitStruct = {
                tokenId: _tokenId,
                tokenURI: _tokenURI,
                sender: _sender,
                price: _price,
                fee: _fee,
                participants: _participants,
                shares: _shares,
                deadline: _deadline,
            };

            const signature = await signBuyPermit(chainId, artTokenAddr, permit, _admin);

            return _artToken.buy({
                tokenId: _tokenId,
                tokenURI: _tokenURI,
                price: _price,
                fee: _fee,
                participants: _participants,
                shares: _shares,
                signature,
                deadline: _deadline,
            });
        }
    });
});
