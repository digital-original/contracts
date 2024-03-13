import { expect } from 'chai';
import { ethers } from 'ethers';
import { ArtTokenMock, AuctionHouse } from '../typechain-types';
import { setNextBlockTimestamp } from '@nomicfoundation/hardhat-network-helpers/dist/src/helpers/time';
import { Signer } from '../types/environment';
import { deployArtTokenMock } from './utils/deploy-art-token-mock';
import { getChainId } from './utils/get-chain-id';
import { getSigners } from './utils/get-signers';
import { signAuctionPermit } from './utils/sign-auction-permit';
import { AuctionPermitStruct, AuctionRaisePermitStruct } from '../types/auction-house';
import { encodeAuctionHouseCreateParams } from './utils/encode-auction-house-create-params';
import { MAX_TOTAL_SHARE } from '../constants/distribution';
import { getSigDeadline } from './utils/get-sig-deadline';
import { deployAuctionHouseUpgradeable } from './utils/deploy-auction-house-upgradeable';
import { getLatestBlockTimestamp } from './utils/get-latest-block-timestamp';
import { signAuctionRaisePermit } from './utils/sign-auction-raise-permit';

describe('AuctionHouse', function () {
    let auctionHouse: AuctionHouse, auctionHouseAddr: string;

    let chainId: number;

    let platform: Signer, platformAddr: string;
    let auctionSigner: Signer, auctionSignerAddr: string;
    let seller: Signer, sellerAddr: string;
    let buyer: Signer, buyerAddr: string;
    let randomAccount: Signer, randomAccountAddr: string;

    let tokenMock: ArtTokenMock, tokenMockAddr: string;

    before(async () => {
        chainId = await getChainId();

        [
            [platform, auctionSigner, seller, buyer, randomAccount],
            [platformAddr, auctionSignerAddr, sellerAddr, buyerAddr, randomAccountAddr],
        ] = await getSigners();

        [tokenMock, tokenMockAddr] = await deployArtTokenMock();
    });

    let blockTimestamp: number;

    let tokenId: bigint;
    let price: bigint;
    let step: bigint;
    let penalty: bigint;
    let startTime: number;
    let endTime: number;
    let deadline: number;
    let participants: string[];
    let shares: bigint[];

    let fee: bigint;

    beforeEach(async () => {
        [[auctionHouse, auctionHouseAddr], tokenId] = await Promise.all([
            deployAuctionHouseUpgradeable(tokenMock, platform, auctionSigner),
            mintToken(),
        ]);

        blockTimestamp = await getLatestBlockTimestamp();

        price = 100000n;
        step = 100n;
        penalty = 500n;
        startTime = blockTimestamp + 60 * 60;
        endTime = blockTimestamp + 60 * 60 * 5;
        deadline = await getSigDeadline();
        participants = [sellerAddr, platformAddr];
        shares = [MAX_TOTAL_SHARE / 2n, MAX_TOTAL_SHARE / 2n];

        fee = 1234n;
    });

    it(`should have correct token`, async () => {
        await expect(auctionHouse.TOKEN()).to.eventually.equal(tokenMockAddr);
    });

    it(`should have correct initial auction count`, async () => {
        await expect(auctionHouse.auctionsCount()).to.eventually.equal(0n);
    });

    it(`should have correct auction signer`, async () => {
        await expect(auctionHouse.AUCTION_SIGNER()).to.eventually.equal(auctionSignerAddr);
    });

    describe(`method 'onERC721Received'`, () => {
        it(`should create correct auction`, async () => {
            await create();

            const auction = await auctionHouse.auction(0);

            expect(auction.tokenId).equal(tokenId);
            expect(auction.seller).equal(sellerAddr);
            expect(auction.buyer).equal(ethers.ZeroAddress);
            expect(auction.price).equal(price);
            expect(auction.step).equal(step);
            expect(auction.penalty).equal(penalty);
            expect(auction.fee).equal(0n);
            expect(auction.startTime).equal(startTime);
            expect(auction.endTime).equal(endTime);
            expect(auction.completed).equal(false);
            expect(auction.participants).to.deep.equal(participants);
            expect(auction.shares).to.deep.equal(shares);
        });

        it(`should increase auction count`, async () => {
            await create();

            const count = await auctionHouse.auctionsCount();

            expect(count).equal(1n);
        });

        it(`should emit created event`, async () => {
            await expect(create())
                .to.be.emit(auctionHouse, 'Created')
                .withArgs(0n, tokenId, sellerAddr, price, step, BigInt(startTime), BigInt(endTime));
        });

        it(`should fail if caller is not token contract`, async () => {
            let [randomCaller] = await deployArtTokenMock();

            await randomCaller.mint(seller, tokenId);

            await expect(create({ _tokenMock: randomCaller })).to.eventually.rejectedWith(
                'TokenHolderUnauthorizedAccount',
            );
        });

        it(`should fail if data is wrong`, async () => {
            const wrongTokenId = tokenId + 1n;

            await expect(create({ _dataTokenId: wrongTokenId })).to.eventually.rejectedWith(
                'AuctionHouseWrongData',
            );

            await expect(create({ _data: '0xff' })).to.eventually.rejectedWith(
                'ERC721InvalidReceiver',
            );
        });

        it(`should fail if signature is expired`, async () => {
            await expect(
                create({ _deadline: await getLatestBlockTimestamp() }),
            ).to.eventually.rejectedWith('EIP712ExpiredSignature');
        });

        it(`should fail if signature is invalid`, async () => {
            const wrongTokenId = tokenId + 1n;

            const permit: AuctionPermitStruct = {
                tokenId: wrongTokenId,
                seller: sellerAddr,
                price,
                step,
                penalty,
                startTime,
                endTime,
                deadline,
                participants,
                shares,
            };

            await expect(create({ _permit: permit })).to.eventually.rejectedWith(
                'EIP712InvalidSignature',
            );
        });

        it(`should fail if auction signer is invalid`, async () => {
            await expect(create({ _auctionSigner: randomAccount })).to.eventually.rejectedWith(
                'EIP712InvalidSignature',
            );
        });

        it(`should fail if start time bigger than end time`, async () => {
            await expect(create({ _startTime: 20, _endTime: 10 })).to.eventually.rejectedWith(
                'AuctionHouseInvalidStartTime',
            );
        });

        it(`should fail if end time lass than block time `, async () => {
            const blockTimestamp = await getLatestBlockTimestamp();

            await expect(
                create({ _startTime: blockTimestamp - 1, _endTime: blockTimestamp }),
            ).to.eventually.rejectedWith('AuctionHouseInvalidEndTime');
        });

        it(`should fail if number of shares is not equal number of participants`, async () => {
            await expect(
                create({ _shares: [MAX_TOTAL_SHARE], _participants: [sellerAddr, platformAddr] }),
            ).to.eventually.rejectedWith('DistributionInvalidSharesCount');
        });

        it(`should fail if total shares is not equal maximum total share`, async () => {
            await expect(
                create({
                    _shares: [MAX_TOTAL_SHARE, MAX_TOTAL_SHARE],
                    _participants: [sellerAddr, platformAddr],
                }),
            ).to.eventually.rejectedWith('DistributionInvalidSharesSum');
        });

        it(`should fail if shares and participants are empty`, async () => {
            await expect(
                create({
                    _shares: [],
                    _participants: [],
                }),
            ).to.eventually.rejectedWith('DistributionInvalidSharesSum');
        });
    });

    describe(`method 'raise' initial`, () => {
        beforeEach(create);

        it(`should set buyer and fee if new price is equal initial price and payment includes fee`, async () => {
            await start();
            await raiseInitial();

            const auction = await auctionHouse.auction(0);

            expect(auction.buyer).equal(buyerAddr);
            expect(auction.fee).equal(fee);
            expect(auction.price).equal(price);
        });

        it(`should set buyer, price and fee if new price is more than initial price and payment is correct`, async () => {
            const _price = price + 1n;

            await start();
            await raiseInitial({ _price });

            const auction = await auctionHouse.auction(0);

            expect(auction.buyer).equal(buyerAddr);
            expect(auction.fee).equal(fee);
            expect(auction.price).equal(_price);
        });

        it(`should increase contract balance by price plus fee`, async () => {
            await start();

            await expect(() => raiseInitial()).to.be.changeEtherBalances(
                [buyer, auctionHouse],
                [(price + fee) * -1n, price + fee],
            );
        });

        it(`should emit raised event`, async () => {
            await start();

            await expect(raiseInitial())
                .to.be.emit(auctionHouse, 'Raised')
                .withArgs(0n, buyerAddr, price);
        });

        it(`should fail if new price is less than initial price`, async () => {
            await start();

            await expect(raiseInitial({ _price: price - 1n })).to.eventually.rejectedWith(
                'AuctionHouseRaiseTooSmall',
            );
        });

        it(`should fail if payment is not equal price plus fee`, async () => {
            await start();

            await expect(raiseInitial({ _value: price })).to.eventually.rejectedWith(
                'AuctionHouseWrongPayment',
            );
        });

        it(`should fail if signature is expired`, async () => {
            await start();

            await expect(
                raiseInitial({ _deadline: await getLatestBlockTimestamp() }),
            ).to.eventually.rejectedWith('EIP712ExpiredSignature');
        });

        it(`should fail if signature is invalid`, async () => {
            await start();

            const permit: AuctionRaisePermitStruct = {
                auctionId: 0n,
                price: 100n,
                fee: 100n,
                deadline,
            };

            await expect(raiseInitial({ _permit: permit })).to.eventually.rejectedWith(
                'EIP712InvalidSignature',
            );
        });

        it(`should fail if auction signer is invalid`, async () => {
            await start();

            await expect(
                raiseInitial({ _auctionSigner: randomAccount }),
            ).to.eventually.rejectedWith('EIP712InvalidSignature');
        });

        it(`should fail if auction does not exist`, async () => {
            await expect(raiseInitial({ _auctionId: 1n })).to.eventually.rejectedWith(
                'AuctionHouseAuctionNotExist',
            );
        });

        it(`should fail if auction has not started`, async () => {
            await expect(raiseInitial()).to.eventually.rejectedWith(
                'AuctionHouseAuctionNotStarted',
            );
        });

        it(`should fail if auction has ended`, async () => {
            await end();

            await expect(raiseInitial()).to.eventually.rejectedWith('AuctionHouseAuctionEnded');
        });

        it(`should fail if auction has buyer`, async () => {
            await startWithBuyer();

            await expect(raiseInitial({ _buyer: randomAccount })).to.eventually.rejectedWith(
                'AuctionHouseBuyerExists',
            );
        });
    });

    describe(`method 'raise'`, () => {
        beforeEach(create);

        it(`should change buyer, price and fee if new price is equal sum of old price plus step and payment includes fee`, async () => {
            const _fee = fee + 30n;

            await startWithBuyer({ _buyer: randomAccount });
            await raise({ _fee });

            const auction = await auctionHouse.auction(0);

            expect(auction.buyer).equal(buyerAddr);
            expect(auction.price).equal(price + step);
            expect(auction.fee).equal(_fee);
        });

        it(`should change buyer, price and fee if new price is more than sum of old price plus step and payment includes fee`, async () => {
            const _price = price + step + 1n;
            const _fee = fee + 30n;

            await startWithBuyer({ _buyer: randomAccount });
            await raise({ _price, _fee });

            const auction = await auctionHouse.auction(0);

            expect(auction.buyer).equal(buyerAddr);
            expect(auction.price).equal(_price);
            expect(auction.fee).equal(_fee);
        });

        it(`should increase contract balance by diff new and old price, new fee and old fee`, async () => {
            const _fee = fee + 30n;

            await startWithBuyer({ _buyer: randomAccount });

            await expect(() => raise({ _fee })).to.be.changeEtherBalances(
                [buyer, auctionHouse],
                [(price + step + _fee) * -1n, step - fee + _fee],
            );
        });

        it(`should transfer old price and old fee to old buyer`, async () => {
            await startWithBuyer({ _buyer: randomAccount });

            await expect(() => raise()).to.be.changeEtherBalances(
                [randomAccountAddr],
                [price + fee],
            );
        });

        it(`should emit raised event`, async () => {
            await startWithBuyer({ _buyer: randomAccount });

            await expect(raise())
                .to.be.emit(auctionHouse, 'Raised')
                .withArgs(0n, buyerAddr, price + step);
        });

        it(`should fail if new price is less than sum of old price plus step`, async () => {
            const _price = price + step - 1n;

            await startWithBuyer({ _buyer: randomAccount });

            await expect(raise({ _price })).to.eventually.rejectedWith('AuctionHouseRaiseTooSmall');
        });

        it(`should fail if payment is not equal price plus fee`, async () => {
            await startWithBuyer({ _buyer: randomAccount });

            await expect(raise({ _value: price + step })).to.eventually.rejectedWith(
                'AuctionHouseWrongPayment',
            );
        });

        it(`should fail if signature is expired`, async () => {
            await startWithBuyer({ _buyer: randomAccount });

            await expect(
                raise({ _deadline: await getLatestBlockTimestamp() }),
            ).to.eventually.rejectedWith('EIP712ExpiredSignature');
        });

        it(`should fail if signature is invalid`, async () => {
            await startWithBuyer({ _buyer: randomAccount });

            const permit: AuctionRaisePermitStruct = {
                auctionId: 0n,
                price: 100n,
                fee: 100n,
                deadline,
            };

            await expect(raise({ _permit: permit })).to.eventually.rejectedWith(
                'EIP712InvalidSignature',
            );
        });

        it(`should fail if auction signer is invalid`, async () => {
            await startWithBuyer({ _buyer: randomAccount });

            await expect(raise({ _auctionSigner: randomAccount })).to.eventually.rejectedWith(
                'EIP712InvalidSignature',
            );
        });

        it(`should fail if auction does not exist`, async () => {
            await expect(raise({ _auctionId: 1n })).to.eventually.rejectedWith(
                'AuctionHouseAuctionNotExist',
            );
        });

        it(`should fail if auction has not started`, async () => {
            await expect(raise()).to.eventually.rejectedWith('AuctionHouseAuctionNotStarted');
        });

        it(`should fail if auction has ended`, async () => {
            await end();

            await expect(raise()).to.eventually.rejectedWith('AuctionHouseAuctionEnded');
        });

        it(`should fail if auction does not have buyer`, async () => {
            await start();

            await expect(raise()).to.eventually.rejectedWith('AuctionHouseBuyerNotExists');
        });
    });

    describe(`method 'take'`, async () => {
        beforeEach(create);

        it(`should mark auction as completed`, async () => {
            await endWithBuyer();

            await take();

            const auction = await auctionHouse.auction(0);

            expect(auction.completed).equal(true);
        });

        it(`should transfer token to buyer`, async () => {
            await endWithBuyer();

            await expect(take())
                .to.be.emit(tokenMock, 'Transfer')
                .withArgs(auctionHouseAddr, buyerAddr, tokenId);

            await expect(tokenMock.ownerOf(tokenId)).to.eventually.equal(buyerAddr);
        });

        it(`should distribute rewards between participants according to shares`, async () => {
            await endWithBuyer();

            const platformIndex = participants.findIndex((a) => a == platformAddr);

            await expect(() => take()).to.be.changeEtherBalances(
                [auctionHouse, ...participants],
                [
                    (price + fee) * -1n,
                    ...shares
                        .map((share) => (price * share) / MAX_TOTAL_SHARE)
                        .map((value, i) => (i == platformIndex ? value + fee : value)),
                ],
            );
        });

        it(`should emit completed event`, async () => {
            await endWithBuyer();

            await expect(take()).to.be.emit(auctionHouse, 'Completed').withArgs(0n, 0n);
        });

        it(`should fail if auction does not exist`, async () => {
            await expect(take(1n)).to.eventually.rejectedWith('AuctionHouseAuctionNotExist');
        });

        it(`should fail if auction has completed`, async () => {
            await endWithBuyer();
            await take();

            await expect(take()).to.eventually.rejectedWith('AuctionHouseAuctionCompleted');
        });

        it(`should fail if auction has not ended`, async () => {
            await start();

            await expect(take()).to.eventually.rejectedWith('AuctionHouseAuctionNotEnded');
        });

        it(`should fail if auction does not have buyer`, async () => {
            await end();

            await expect(take()).to.eventually.rejectedWith('AuctionHouseBuyerNotExists');
        });
    });

    describe(`method 'buy'`, async () => {
        beforeEach(create);

        it(`should set new buyer`, async () => {
            await end();
            await buy();

            const auction = await auctionHouse.auction(0);

            expect(auction.buyer).equal(buyerAddr);
        });

        it(`should mark auction as completed`, async () => {
            await end();
            await buy();

            const auction = await auctionHouse.auction(0);

            expect(auction.completed).equal(true);
        });

        it(`should transfer token to buyer`, async () => {
            await end();

            await expect(buy())
                .to.be.emit(tokenMock, 'Transfer')
                .withArgs(auctionHouseAddr, buyerAddr, tokenId);

            await expect(tokenMock.ownerOf(tokenId)).to.eventually.equal(buyerAddr);
        });

        it(`should distribute rewards between participants according to shares`, async () => {
            await end();

            await expect(() => buy()).to.be.changeEtherBalances(
                [buyer, ...participants],
                [price * -1n, ...shares.map((share) => (price * share) / MAX_TOTAL_SHARE)],
            );
        });

        it(`should emit completed event`, async () => {
            await end();

            await expect(buy()).to.be.emit(auctionHouse, 'Completed').withArgs(0n, 1n);
        });

        it(`should fail if sent value is not equal price`, async () => {
            await end();

            await expect(buy({ _price: price - 1n })).to.eventually.rejectedWith(
                'AuctionHouseWrongPayment',
            );
            await expect(buy({ _price: price + 1n })).to.eventually.rejectedWith(
                'AuctionHouseWrongPayment',
            );
        });

        it(`should fail if auction does not exist`, async () => {
            await expect(buy({ _auctionId: 1n })).to.eventually.rejectedWith(
                'AuctionHouseAuctionNotExist',
            );
        });

        it(`should fail if auction has completed`, async () => {
            await endWithBuyer();
            await take();

            await expect(buy()).to.eventually.rejectedWith('AuctionHouseAuctionCompleted');
        });

        it(`should fail if auction has not ended`, async () => {
            await start();

            await expect(buy()).to.eventually.rejectedWith('AuctionHouseAuctionNotEnded');
        });

        it(`should fail if auction has buyer`, async () => {
            await endWithBuyer();

            await expect(buy()).to.eventually.rejectedWith('AuctionHouseBuyerExists');
        });
    });

    describe(`method 'unlock'`, async () => {
        beforeEach(create);

        it(`should mark auction as completed`, async () => {
            await end();

            await unlock();

            const auction = await auctionHouse.auction(0);

            expect(auction.completed).equal(true);
        });

        it(`should transfer token to seller`, async () => {
            await end();

            await expect(unlock())
                .to.be.emit(tokenMock, 'Transfer')
                .withArgs(auctionHouseAddr, sellerAddr, tokenId);

            await expect(tokenMock.ownerOf(tokenId)).to.eventually.equal(sellerAddr);
        });

        it(`should transfer penalty to platform`, async () => {
            await end();

            await expect(() => unlock({ _singer: randomAccount })).to.be.changeEtherBalances(
                [randomAccount, platform],
                [penalty * -1n, penalty],
            );
        });

        it(`should emit completed event`, async () => {
            await end();

            await expect(unlock()).to.be.emit(auctionHouse, 'Completed').withArgs(0n, 2n);
        });

        it(`should fail if sent value is not equal penalty`, async () => {
            await end();

            await expect(
                unlock({
                    _penalty: penalty - 1n,
                }),
            ).to.eventually.rejectedWith('AuctionHouseWrongPayment');
        });

        it(`should fail if auction does not exist`, async () => {
            await end();

            await expect(
                unlock({
                    _auctionId: 1n,
                }),
            ).to.eventually.rejectedWith('AuctionHouseAuctionNotExist');
        });

        it(`should fail if auction has completed`, async () => {
            await endWithBuyer();
            await take();

            await expect(unlock()).to.eventually.rejectedWith('AuctionHouseAuctionCompleted');
        });

        it(`should fail if auction has not ended`, async () => {
            await start();

            await expect(unlock()).to.eventually.rejectedWith('AuctionHouseAuctionNotEnded');
        });

        it(`should fail if auction has buyer`, async () => {
            await endWithBuyer();

            await expect(unlock()).to.eventually.rejectedWith('AuctionHouseBuyerExists');
        });
    });

    async function create(
        params: {
            _tokenId?: bigint;
            _dataTokenId?: bigint;
            _seller?: string;
            _price?: bigint;
            _step?: bigint;
            _penalty?: bigint;
            _startTime?: number;
            _endTime?: number;
            _deadline?: number;
            _participants?: string[];
            _shares?: bigint[];
            _auctionSigner?: Signer;
            _tokenMock?: ArtTokenMock;
            _signer?: Signer;
            _permit?: AuctionPermitStruct;
            _data?: string;
        } = {},
    ) {
        const {
            _tokenId = tokenId,
            _dataTokenId = tokenId,
            _seller = sellerAddr,
            _price = price,
            _step = step,
            _penalty = penalty,
            _startTime = startTime,
            _endTime = endTime,
            _deadline = deadline,
            _participants = participants,
            _shares = shares,
            _auctionSigner = auctionSigner,
            _tokenMock = tokenMock,
            _signer = seller,
            _permit,
            _data,
        } = params;

        const permit: AuctionPermitStruct = _permit || {
            tokenId: _tokenId,
            seller: _seller,
            price: _price,
            step: _step,
            penalty: _penalty,
            startTime: _startTime,
            endTime: _endTime,
            deadline: _deadline,
            participants: _participants,
            shares: _shares,
        };

        const signature = await signAuctionPermit(
            chainId,
            auctionHouseAddr,
            permit,
            _auctionSigner,
        );

        const data =
            _data ||
            encodeAuctionHouseCreateParams(
                _dataTokenId,
                _seller,
                _price,
                _step,
                _penalty,
                _startTime,
                _endTime,
                _deadline,
                _participants,
                _shares,
                signature,
            );

        return _tokenMock
            .connect(_signer)
            ['safeTransferFrom(address,address,uint256,bytes)'](
                _seller,
                auctionHouse,
                _tokenId,
                data,
            );
    }

    async function raiseInitial(
        params: {
            _auctionId?: bigint;
            _price?: bigint;
            _fee?: bigint;
            _deadline?: number;
            _auctionSigner?: Signer;
            _permit?: AuctionRaisePermitStruct;
            _buyer?: Signer;
            _value?: bigint;
        } = {},
    ) {
        const {
            _auctionId = 0n,
            _price = price,
            _fee = fee,
            _deadline = deadline,
            _auctionSigner = auctionSigner,
            _buyer = buyer,
            _value = _price + _fee,
            _permit,
        } = params;

        const permit: AuctionRaisePermitStruct = _permit || {
            auctionId: _auctionId,
            price: _price,
            fee: _fee,
            deadline: _deadline,
        };

        const signature = await signAuctionRaisePermit(
            chainId,
            auctionHouseAddr,
            permit,
            _auctionSigner,
        );

        return auctionHouse
            .connect(_buyer)
            ['raise(uint256,uint256,uint256,uint256,bool,bytes)'](
                _auctionId,
                _price,
                _fee,
                _deadline,
                true,
                signature,
                { value: _value },
            );
    }

    async function raise(
        params: {
            _auctionId?: bigint;
            _price?: bigint;
            _fee?: bigint;
            _deadline?: number;
            _auctionSigner?: Signer;
            _permit?: AuctionRaisePermitStruct;
            _buyer?: Signer;
            _value?: bigint;
        } = {},
    ) {
        const {
            _auctionId = 0n,
            _price = price + step,
            _fee = fee,
            _deadline = deadline,
            _auctionSigner = auctionSigner,
            _buyer = buyer,
            _value = _price + _fee,
            _permit,
        } = params;

        const permit: AuctionRaisePermitStruct = _permit || {
            auctionId: _auctionId,
            price: _price,
            fee: _fee,
            deadline: _deadline,
        };

        const signature = await signAuctionRaisePermit(
            chainId,
            auctionHouseAddr,
            permit,
            _auctionSigner,
        );

        return auctionHouse
            .connect(_buyer)
            ['raise(uint256,uint256,uint256,uint256,bytes)'](
                _auctionId,
                _price,
                _fee,
                _deadline,
                signature,
                { value: _value },
            );
    }

    async function take(auctionId = 0n) {
        return auctionHouse.take(auctionId);
    }

    async function buy(
        params: {
            _auctionId?: bigint;
            _price?: bigint;
            _buyer?: Signer;
        } = {},
    ) {
        const { _auctionId = 0n, _price = price, _buyer = buyer } = params;

        return auctionHouse.connect(_buyer).buy(_auctionId, { value: _price });
    }

    async function unlock(
        params: {
            _auctionId?: bigint;
            _penalty?: bigint;
            _singer?: Signer;
        } = {},
    ) {
        const { _auctionId = 0n, _penalty = penalty, _singer = randomAccount } = params;

        return auctionHouse.connect(_singer).unlock(_auctionId, { value: _penalty });
    }

    async function mintToken() {
        const tokenId = await tokenMock.totalSupply();

        await tokenMock.mint(seller, tokenId);

        return tokenId;
    }

    async function start(auctionId = 0n) {
        const auction = await auctionHouse.auction(auctionId);

        await setNextBlockTimestamp(auction.startTime);
    }

    async function startWithBuyer(
        params: {
            _auctionId?: bigint;
            _buyer?: Signer;
        } = {},
    ) {
        const { _auctionId = 0n, _buyer = buyer } = params;

        await start(_auctionId);
        await raiseInitial({ _buyer });
    }

    async function endWithBuyer(
        params: {
            _auctionId?: bigint;
            _buyer?: Signer;
        } = {},
    ) {
        const { _auctionId = 0n, _buyer = buyer } = params;

        await startWithBuyer({ _auctionId, _buyer });
        await end(_auctionId);
    }

    async function end(auctionId = 0n) {
        const auction = await auctionHouse.auction(auctionId);

        await setNextBlockTimestamp(auction.endTime);
    }
});
