import { expect } from 'chai';
import { ethers } from 'ethers';
import { ArtToken, AuctionHouse, USDC } from '../typechain-types';
import { setNextBlockTimestamp } from '@nomicfoundation/hardhat-network-helpers/dist/src/helpers/time';
import { mine } from '@nomicfoundation/hardhat-network-helpers/dist/src/helpers/mine';
import { Signer } from '../types/environment';
import { getChainId } from './utils/get-chain-id';
import { getSigners } from './utils/get-signers';
import { TOTAL_SHARE } from '../constants/distribution';
import { getValidDeadline } from './utils/get-valid-deadline';
import { getLatestBlockTimestamp } from './utils/get-latest-block-timestamp';
import { deployProtocol } from '../scripts/deploy-protocol';
import { deployUsdc } from './utils/deploy-usdc';
import { CreatePermitStruct } from '../types/auction-house';
import { signCreatePermit } from './utils/sign-auction-house-create-permit';
import { BuyPermitStruct } from '../types/art-token';
import { signBuyPermit } from './utils/sign-art-token-buy-permit';

describe('AuctionHouse', function () {
    let auctionHouse: AuctionHouse, auctionHouseAddr: string;
    let artToken: ArtToken, artTokenAddr: string;
    let usdc: USDC, usdcAddr: string;

    let chainId: number;

    let main: Signer, mainAddr: string;
    let admin: Signer, adminAddr: string;
    let financier: Signer, financierAddr: string;
    let institution: Signer, institutionAddr: string;
    let buyer: Signer, buyerAddr: string;
    let randomAccount: Signer, randomAccountAddr: string;

    const adminRole = ethers.keccak256(Buffer.from('ADMIN_ROLE'));
    const financialRole = ethers.keccak256(Buffer.from('FINANCIAL_ROLE'));

    before(async () => {
        chainId = await getChainId();

        [usdc, usdcAddr] = await deployUsdc();

        [
            [main, admin, financier, institution, buyer, randomAccount],
            [mainAddr, adminAddr, financierAddr, institutionAddr, buyerAddr, randomAccountAddr],
        ] = await getSigners();
    });

    beforeEach(async () => {
        const {
            auctionHouse: _auctionHouse,
            auctionHouseAddr: _auctionHouseAddr,
            artToken: _artToken,
            artTokenAddr: _artTokenAddr,
        } = await deployProtocol({
            main,
            usdc,
            minAuctionDurationHours: 1,
        });

        await _artToken.connect(main).transferUniqueRole(adminRole, admin);
        await _artToken.connect(main).transferUniqueRole(financialRole, financier);
        await _auctionHouse.connect(main).transferUniqueRole(adminRole, admin);
        await _auctionHouse.connect(main).transferUniqueRole(financialRole, financier);

        await Promise.all([usdc.connect(buyer).mint(), usdc.connect(randomAccount).mint()]);

        await Promise.all([
            usdc.connect(buyer).approve(_auctionHouse, ethers.MaxInt256),
            usdc.connect(buyer).approve(_artToken, ethers.MaxInt256),
            usdc.connect(randomAccount).approve(_auctionHouse, ethers.MaxInt256),
        ]);

        auctionHouse = _auctionHouse;
        auctionHouseAddr = _auctionHouseAddr;
        artToken = _artToken;
        artTokenAddr = _artTokenAddr;
    });

    let auctionId: bigint;
    let tokenId: bigint;
    let tokenURI: string;
    let price: bigint;
    let fee: bigint;
    let step: bigint;
    let endTime: number;
    let participants: string[];
    let shares: bigint[];
    let deadline: number;

    beforeEach(async () => {
        auctionId = 3n;
        tokenId = 4n;
        tokenURI = 'ipfs://Q...';
        price = 100_000_000n;
        fee = 100_000_000n;
        step = 1_000_000n;
        endTime = await getValidDeadline();
        participants = [financierAddr, institutionAddr];
        shares = [TOTAL_SHARE / 5n, (TOTAL_SHARE / 5n) * 4n];
        deadline = await getValidDeadline();
    });

    describe(`method 'create'`, () => {
        it(`should create correct auction`, async () => {
            await create();

            const auction = await getAuction();

            expect(auction.tokenId).equal(tokenId);
            expect(auction.tokenURI).equal(tokenURI);
            expect(auction.buyer).equal(ethers.ZeroAddress);
            expect(auction.price).equal(price);
            expect(auction.fee).equal(fee);
            expect(auction.step).equal(step);
            expect(auction.endTime).equal(endTime);
            expect(auction.sold).equal(false);
            expect(auction.participants).to.deep.equal(participants);
            expect(auction.shares).to.deep.equal(shares);
        });

        it(`should create new auction for token that was not sold at the previous auction`, async () => {
            await create();
            await end();

            const _auctionId = 5n;
            const _endTime = await getValidDeadline();
            const _deadline = await getValidDeadline();

            await create({
                _auctionId,
                _endTime,
                _deadline,
            });

            const auction = await getAuction(_auctionId);

            expect(auction.tokenId).equal(tokenId);
            expect(auction.tokenURI).equal(tokenURI);
            expect(auction.buyer).equal(ethers.ZeroAddress);
            expect(auction.price).equal(price);
            expect(auction.fee).equal(fee);
            expect(auction.step).equal(step);
            expect(auction.endTime).equal(_endTime);
            expect(auction.sold).equal(false);
            expect(auction.participants).to.deep.equal(participants);
            expect(auction.shares).to.deep.equal(shares);
        });

        it(`should emit created event`, async () => {
            const transaction = await create();

            await expect(transaction)
                .to.be.emit(auctionHouse, 'Created')
                .withArgs(auctionId, tokenId, price, endTime);
        });

        it(`should fail if end time lass than block time`, async () => {
            const blockTimestamp = await getLatestBlockTimestamp();

            const _endTime = blockTimestamp + 100;

            await setNextBlockTimestamp(_endTime);

            await expect(create({ _endTime })).to.eventually.rejectedWith(
                'AuctionHouseInvalidEndTime',
            );
        });

        it(`should fail if auction already exists`, async () => {
            await create();

            await expect(create()).to.eventually.rejectedWith('AuctionHouseAuctionExists');
        });

        it(`should fail if token is already at active auction`, async () => {
            await create();

            const _auctionId = 5n;

            await expect(create({ _auctionId })).to.eventually.rejectedWith(
                'AuctionHouseTokenReserved',
            );
        });

        it(`should fail if token is at auction with buyer`, async () => {
            await create();
            await endWithBuyer();

            const _auctionId = 5n;
            const _endTime = await getValidDeadline();
            const _deadline = await getValidDeadline();

            await expect(create({ _auctionId, _endTime, _deadline })).to.eventually.rejectedWith(
                'AuctionHouseTokenReserved',
            );
        });

        it(`should fail if token is already minted`, async () => {
            const buyPermit: BuyPermitStruct = {
                tokenId,
                tokenURI,
                sender: buyerAddr,
                price: 100_000_001n,
                fee: 100_000_001n,
                participants: [financierAddr],
                shares: [TOTAL_SHARE],
                deadline,
            };

            const signature = await signBuyPermit(chainId, artTokenAddr, buyPermit, admin);

            await artToken.connect(buyer).buy({
                tokenId,
                tokenURI,
                price: buyPermit.price,
                fee: buyPermit.fee,
                participants: buyPermit.participants,
                shares: buyPermit.shares,
                signature,
                deadline,
            });

            await expect(create()).to.eventually.rejectedWith('AuctionHouseTokenReserved');
        });

        describe(`permit logic`, () => {
            it(`should fail if permit signer is not admin`, async () => {
                const _admin = randomAccount;

                await expect(create({ _admin })).to.be.rejectedWith('EIP712InvalidSignature');
            });

            it(`should fail if permit is expired`, async () => {
                const _deadline = await getLatestBlockTimestamp();

                await expect(create({ _deadline })).to.be.rejectedWith('EIP712ExpiredSignature');
            });
        });

        describe(`distribution logic`, () => {
            it(`should fail if number of shares is not equal number of participants`, async () => {
                const _participants = [financierAddr];
                const _shares = [TOTAL_SHARE / 2n, TOTAL_SHARE / 2n];

                await expect(create({ _participants, _shares })).to.be.rejectedWith(
                    'DistributionInvalidSharesCount',
                );
            });

            it(`should fail if total shares is not equal TOTAL_SHARE`, async () => {
                const _participants = [financierAddr, institutionAddr];
                const _shares = [TOTAL_SHARE, 1n];

                await expect(create({ _participants, _shares })).to.be.rejectedWith(
                    'DistributionInvalidSharesSum',
                );
            });

            it(`should fail if shares and participants are empty`, async () => {
                const _participants: string[] = [];
                const _shares: bigint[] = [];

                await expect(create({ _participants, _shares })).to.be.rejectedWith(
                    'DistributionInvalidSharesSum',
                );
            });
        });
    });

    describe(`method 'tokenReserved'`, () => {
        it(`should return 'true' for token that is at active auction`, async () => {
            await create();

            await expect(auctionHouse.tokenReserved(tokenId)).to.eventually.equal(true);
        });

        it(`should return 'true' for token that is at auction with buyer`, async () => {
            await create();
            await endWithBuyer();

            await expect(auctionHouse.tokenReserved(tokenId)).to.eventually.equal(true);
        });

        it(`should return 'false' for token that was not sold at the previous auction`, async () => {
            await create();
            await end();

            await expect(auctionHouse.tokenReserved(tokenId)).to.eventually.equal(false);
        });

        it(`should return 'false' for token that has never been put at auction`, async () => {
            await expect(auctionHouse.tokenReserved(tokenId)).to.eventually.equal(false);
        });
    });

    describe(`method 'raiseInitial'`, () => {
        beforeEach(async () => {
            await create();
            auctionHouse = auctionHouse.connect(buyer);
        });

        it(`should set buyer if new price is equal initial price`, async () => {
            await raiseInitial();

            const auction = await getAuction();

            expect(auction.buyer).equal(buyerAddr);
            expect(auction.price).equal(price);
        });

        it(`should set buyer and change price if new price is more than initial price`, async () => {
            const _price = price + 1n;

            await raiseInitial({ _price });

            const auction = await getAuction();

            expect(auction.buyer).equal(buyerAddr);
            expect(auction.price).equal(_price);
        });

        it(`should emit raised event`, async () => {
            const transaction = await raiseInitial();

            await expect(transaction)
                .to.be.emit(auctionHouse, 'Raised')
                .withArgs(auctionId, buyerAddr, price);
        });

        it(`should transfer price and fee from buyer to contract`, async () => {
            const transaction = await raiseInitial();

            await expect(transaction)
                .to.be.emit(usdc, 'Transfer')
                .withArgs(buyerAddr, auctionHouseAddr, price + fee);
        });

        it(`should fail if new price is less than initial price`, async () => {
            const _price = price - 1n;

            await expect(raiseInitial({ _price })).to.eventually.rejectedWith(
                'AuctionHouseRaiseTooSmall',
            );
        });

        it(`should fail if auction does not exist`, async () => {
            const _auctionId = auctionId + 123n;

            await expect(raiseInitial({ _auctionId })).to.eventually.rejectedWith(
                'AuctionHouseAuctionNotExist',
            );
        });

        it(`should fail if auction has buyer`, async () => {
            await raiseInitial();

            await expect(raiseInitial()).to.eventually.rejectedWith('AuctionHouseBuyerExists');
        });

        it(`should fail if auction has ended`, async () => {
            await end();

            await expect(raiseInitial()).to.eventually.rejectedWith('AuctionHouseAuctionEnded');
        });
    });

    describe(`method 'raise'`, () => {
        beforeEach(async () => {
            await create();
        });

        it(`should change buyer and price if new price is equal sum of old price plus step`, async () => {
            await raiseInitial({ _auctionHouse: auctionHouse.connect(randomAccount) });
            await raise({ _auctionHouse: auctionHouse.connect(buyer) });

            const auction = await getAuction();

            expect(auction.buyer).equal(buyerAddr);
            expect(auction.price).equal(price + step);
        });

        it(`should change buyer and price if new price is more than sum of old price plus step`, async () => {
            await raiseInitial({ _auctionHouse: auctionHouse.connect(randomAccount) });

            const _step = step + 55n;

            await raise({ _step, _auctionHouse: auctionHouse.connect(buyer) });

            const auction = await getAuction();

            expect(auction.buyer).equal(buyerAddr);
            expect(auction.price).equal(price + _step);
        });

        it(`should transfer price and fee from buyer to contract`, async () => {
            await raiseInitial({ _auctionHouse: auctionHouse.connect(randomAccount) });

            const transaction = await raise({ _auctionHouse: auctionHouse.connect(buyer) });

            await expect(transaction)
                .to.be.emit(usdc, 'Transfer')
                .withArgs(buyerAddr, auctionHouseAddr, price + step + fee);
        });

        it(`should transfer old price and fee to old buyer`, async () => {
            await raiseInitial({ _auctionHouse: auctionHouse.connect(randomAccount) });

            const transaction = await raise({ _auctionHouse: auctionHouse.connect(buyer) });

            await expect(transaction)
                .to.be.emit(usdc, 'Transfer')
                .withArgs(auctionHouseAddr, randomAccountAddr, price + fee);
        });

        it(`should emit raised event`, async () => {
            await raiseInitial({ _auctionHouse: auctionHouse.connect(randomAccount) });

            const transaction = await raise({ _auctionHouse: auctionHouse.connect(buyer) });

            await expect(transaction)
                .to.be.emit(auctionHouse, 'Raised')
                .withArgs(auctionId, buyerAddr, price + step);
        });

        it(`should fail if new price is less than sum of old price plus step`, async () => {
            await raiseInitial({ _auctionHouse: auctionHouse.connect(randomAccount) });

            const _step = step - 1n;

            await expect(
                raise({ _step, _auctionHouse: auctionHouse.connect(buyer) }),
            ).to.eventually.rejectedWith('AuctionHouseRaiseTooSmall');
        });

        it(`should fail if auction does not exist`, async () => {
            const _auctionId = auctionId + 123n;

            await expect(raise({ _auctionId })).to.eventually.rejectedWith(
                'AuctionHouseAuctionNotExist',
            );
        });

        it(`should fail if auction has ended`, async () => {
            await end();

            await expect(raise()).to.eventually.rejectedWith('AuctionHouseAuctionEnded');
        });

        it(`should fail if auction does not have buyer`, async () => {
            await expect(raise()).to.eventually.rejectedWith('AuctionHouseBuyerNotExists');
        });
    });

    describe(`method 'finish'`, async () => {
        beforeEach(async () => {
            await create();
        });

        it(`should mark auction as sold`, async () => {
            await endWithBuyer();

            await finish();

            const auction = await getAuction();

            expect(auction.sold).equal(true);
        });

        it(`should mint token for buyer`, async () => {
            await endWithBuyer();

            const transaction = await finish();

            await Promise.all([
                expect(transaction)
                    .to.be.emit(artToken, 'Transfer')
                    .withArgs(ethers.ZeroAddress, buyerAddr, tokenId),
                expect(artToken.ownerOf(tokenId)).to.eventually.equal(buyerAddr),
            ]);
        });

        it(`should emit sold event`, async () => {
            await endWithBuyer();

            const transaction = await finish();

            await expect(transaction).to.be.emit(auctionHouse, 'Sold').withArgs(auctionId);
        });

        it(`should transfer fee to financier`, async () => {
            await endWithBuyer();

            const transaction = await finish();

            await expect(transaction)
                .to.be.emit(usdc, 'Transfer')
                .withArgs(auctionHouseAddr, financierAddr, fee);
        });

        it(`should fail if auction does not exist`, async () => {
            const _auctionId = auctionId + 123n;

            await expect(finish(_auctionId)).to.eventually.rejectedWith(
                'AuctionHouseAuctionNotExist',
            );
        });

        it(`should fail if auction has sold`, async () => {
            await endWithBuyer();
            await finish();

            await expect(finish()).to.eventually.rejectedWith('AuctionHouseTokenSold');
        });

        it(`should fail if auction has not ended`, async () => {
            await expect(finish()).to.eventually.rejectedWith('AuctionHouseAuctionNotEnded');
        });

        it(`should fail if auction does not have buyer`, async () => {
            await end();

            await expect(finish()).to.eventually.rejectedWith('AuctionHouseBuyerNotExists');
        });

        describe(`distribution logic`, () => {
            it(`should distribute reward between participants according to shares`, async () => {
                await endWithBuyer();

                const transaction = await finish();

                await Promise.all([
                    expect(transaction)
                        .to.be.emit(usdc, 'Transfer')
                        .withArgs(
                            auctionHouseAddr,
                            participants[0],
                            (price * shares[0]) / TOTAL_SHARE,
                        ),
                    expect(transaction)
                        .to.be.emit(usdc, 'Transfer')
                        .withArgs(
                            auctionHouseAddr,
                            participants[1],
                            (price * shares[1]) / TOTAL_SHARE,
                        ),
                ]);
            });
        });
    });

    async function create(
        params: {
            _auctionId?: bigint;
            _tokenId?: bigint;
            _tokenURI?: string;
            _price?: bigint;
            _fee?: bigint;
            _step?: bigint;
            _endTime?: number;
            _participants?: string[];
            _shares?: bigint[];
            _deadline?: number;
            _admin?: Signer;
            _auctionHouse?: AuctionHouse;
        } = {},
    ) {
        const {
            _auctionId = auctionId,
            _tokenId = tokenId,
            _tokenURI = tokenURI,
            _price = price,
            _fee = fee,
            _step = step,
            _endTime = endTime,
            _participants = participants,
            _shares = shares,
            _deadline = deadline,
            _admin = admin,
            _auctionHouse = auctionHouse,
        } = params;

        const permit: CreatePermitStruct = {
            auctionId: _auctionId,
            tokenId: _tokenId,
            tokenURI: _tokenURI,
            price: _price,
            fee: _fee,
            step: _step,
            endTime: _endTime,
            participants: _participants,
            shares: _shares,
            deadline: _deadline,
        };

        const signature = await signCreatePermit(chainId, auctionHouseAddr, permit, _admin);

        return _auctionHouse.create({
            auctionId: _auctionId,
            tokenId: _tokenId,
            tokenURI: _tokenURI,
            price: _price,
            fee: _fee,
            step: _step,
            endTime: _endTime,
            participants: _participants,
            shares: _shares,
            signature,
            deadline: _deadline,
        });
    }

    async function raiseInitial(
        params: {
            _auctionId?: bigint;
            _price?: bigint;
            _auctionHouse?: AuctionHouse;
        } = {},
    ) {
        const { _auctionId = auctionId, _price = price, _auctionHouse = auctionHouse } = params;

        return _auctionHouse.raiseInitial(_auctionId, _price);
    }

    async function raise(
        params: {
            _auctionId?: bigint;
            _price?: bigint;
            _step?: bigint;
            _auctionHouse?: AuctionHouse;
        } = {},
    ) {
        const {
            _auctionId = auctionId,
            _price = price,
            _step = step,
            _auctionHouse = auctionHouse,
        } = params;

        return _auctionHouse.raise(_auctionId, _price + _step);
    }

    async function finish(_auctionId = auctionId) {
        return auctionHouse.finish(_auctionId);
    }

    async function getAuction(_auctionId = auctionId) {
        return auctionHouse.auction(_auctionId);
    }

    async function end() {
        const auction = await getAuction();

        await setNextBlockTimestamp(auction.endTime + 1n);

        await mine();
    }

    async function endWithBuyer(_buyer: Signer = buyer) {
        await raiseInitial({ _auctionHouse: auctionHouse.connect(_buyer) });
        await end();
    }
});
