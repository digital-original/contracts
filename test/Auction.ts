import { expect } from 'chai';
import { ZeroAddress, Signer } from 'ethers';
import { setNextBlockTimestamp } from '@nomicfoundation/hardhat-network-helpers/dist/src/helpers/time';
import { Auction, TokenMock } from '../typechain-types';
import { AuctionPermitStruct } from '../types/auction';
import { encodeAuctionPlaceParams } from './utils/encode-auction-place-params copy';
import { signAuctionPermit } from './utils/sign-auction-permit';
import { getSigners } from './utils/get-signers';
import { getChainId } from './utils/get-chain-id';
import { deployTokenMock } from './utils/deploy-token-mock';
import { MAX_TOTAL_SHARE } from '../constants/distribution';
import { getSignDeadline } from './utils/get-sign-deadline';
import { deployAuctionUpgradeable } from './utils/deploy-auction-upgradeable';
import { getAuctionEndTime } from './utils/get-auction-end-time';

describe('Auction', function () {
    let auction: Auction, auctionAddr: string;

    let chainId: number;

    let platform: Signer, platformAddr: string;
    let auctionSigner: Signer, auctionSignerAddr: string;
    let tokenOwner: Signer, tokenOwnerAddr: string;
    let buyer1: Signer, buyer1Addr: string;
    let buyer2: Signer, buyer2Addr: string;
    let randomAccount: Signer, randomAccountAddr: string;

    let tokenMock: TokenMock, tokenMockAddr: string;

    enum OrderStatus {
        NotExists,
        Placed,
        Ended,
    }

    let tokenId: bigint;
    let seller: string;
    let price: bigint;
    let priceStep: bigint;
    let endTime: number;
    let deadline: number;
    let participants: string[];
    let shares: bigint[];

    async function placeOrder(
        params: {
            _tokenId?: bigint;
            _seller?: string;
            _price?: bigint;
            _priceStep?: bigint;
            _endTime?: number;
            _deadline?: number;
            _participants?: string[];
            _shares?: bigint[];
            _tokenMock?: TokenMock;
            _marketSigner?: Signer;
        } = {},
    ) {
        const {
            _tokenId = tokenId,
            _seller = seller,
            _price = price,
            _priceStep = priceStep,
            _endTime = endTime,
            _deadline = deadline,
            _participants = participants,
            _shares = shares,
            _tokenMock = tokenMock,
            _marketSigner = auctionSigner,
        } = params;

        const permit: AuctionPermitStruct = {
            seller: _seller,
            tokenId: _tokenId,
            price: _price,
            priceStep: _priceStep,
            endTime: _endTime,
            participants: _participants,
            shares: _shares,
            deadline: _deadline,
        };

        const signature = await signAuctionPermit(chainId, auctionAddr, permit, _marketSigner);

        return _tokenMock['safeTransferFrom(address,address,uint256,bytes)'](
            _seller,
            auction,
            _tokenId,
            encodeAuctionPlaceParams(
                _price,
                _priceStep,
                _endTime,
                _deadline,
                _participants,
                _shares,
                signature,
            ),
        );
    }

    async function raise(params: { orderId: number; _price: bigint; _auction?: Auction }) {
        const { orderId, _price, _auction = auction } = params;

        return _auction.raise(orderId, { value: _price });
    }

    async function end(params: { orderId: number; _auction?: Auction }) {
        const { orderId, _auction = auction } = params;

        return _auction.end(orderId);
    }

    async function mintToken() {
        const tokenId = await tokenMock.totalSupply();

        await tokenMock.mint(tokenOwner, tokenId);

        return tokenId;
    }

    before(async () => {
        chainId = await getChainId();

        [
            [platform, auctionSigner, tokenOwner, buyer1, buyer2, randomAccount],
            [
                platformAddr,
                auctionSignerAddr,
                tokenOwnerAddr,
                buyer1Addr,
                buyer2Addr,
                randomAccountAddr,
            ],
        ] = await getSigners();

        [tokenMock, tokenMockAddr] = await deployTokenMock();

        tokenMock = tokenMock.connect(tokenOwner);
    });

    beforeEach(async () => {
        [[auction, auctionAddr], tokenId] = await Promise.all([
            deployAuctionUpgradeable(tokenMock, auctionSigner),
            mintToken(),
        ]);

        seller = tokenOwnerAddr;
        price = 100000n;
        priceStep = 100n;
        endTime = await getAuctionEndTime();
        participants = [tokenOwnerAddr, platformAddr];
        shares = [MAX_TOTAL_SHARE / 2n, MAX_TOTAL_SHARE / 2n];
        deadline = await getSignDeadline();

        auction = auction.connect(buyer1);
    });

    it(`should have correct token`, async () => {
        await expect(auction.TOKEN()).to.eventually.equal(tokenMockAddr);
    });

    it(`should have correct initial order count`, async () => {
        await expect(auction.orderCount()).to.eventually.equal(0n);
    });

    it(`should have correct auction signer`, async () => {
        await expect(auction.AUCTION_SIGNER()).to.eventually.equal(auctionSignerAddr);
    });

    describe(`method 'onERC721Received'`, () => {
        it(`should place correct order`, async () => {
            await placeOrder();

            const order = await auction.order(0);

            expect(order.seller).equal(seller);
            expect(order.buyer).equal(ZeroAddress);
            expect(order.tokenId).equal(tokenId);
            expect(order.price).equal(price);
            expect(order.priceStep).equal(priceStep);
            expect(order.endTime).equal(endTime);
            expect(order.status).equal(OrderStatus.Placed);
            expect(order.participants).to.deep.equal(participants);
            expect(order.shares).to.deep.equal(shares);
        });

        it(`should emit placed event`, async () => {
            await expect(placeOrder())
                .to.emit(auction, 'Placed')
                .withArgs(0, tokenId, seller, price, priceStep, endTime);
        });

        it(`should increase order count`, async () => {
            await placeOrder();

            await expect(auction.orderCount()).to.eventually.equal(1);
        });

        it(`should fail if signature is expired`, async () => {
            const _deadline = await getSignDeadline();
            const _endTime = (await getAuctionEndTime()) + 20;

            await setNextBlockTimestamp(_deadline + 10);

            await expect(placeOrder({ _endTime, _deadline })).to.be.rejectedWith(
                'EIP712WrapperExpiredSignature',
            );
        });

        it(`should fail if end time lass than block time`, async () => {
            const _endTime = await getAuctionEndTime();

            await setNextBlockTimestamp(_endTime + 10);

            await expect(placeOrder({ _endTime })).to.be.rejectedWith('AuctionInvalidEndTime');
        });

        it(`should fail if number of shares is not equal number of participants`, async () => {
            const _participants = [tokenOwnerAddr];
            const _shares = [MAX_TOTAL_SHARE / 2n, MAX_TOTAL_SHARE / 2n];

            await expect(placeOrder({ _participants, _shares })).to.be.rejectedWith(
                'DistributionInvalidSharesCount',
            );
        });

        it(`should fail if total shares is not equal maximum total share`, async () => {
            const _participants = [tokenOwnerAddr, platformAddr];
            const _shares = [MAX_TOTAL_SHARE, 1n];

            await expect(placeOrder({ _participants, _shares })).to.be.rejectedWith(
                'DistributionInvalidSharesSum',
            );
        });

        it(`should fail if shares and participants are empty`, async () => {
            const _participants: string[] = [];
            const _shares: bigint[] = [];

            await expect(placeOrder({ _participants, _shares })).to.be.rejectedWith(
                'DistributionInvalidSharesSum',
            );
        });

        it(`should fail if market signer is invalid`, async () => {
            const _marketSigner = randomAccount;

            await expect(placeOrder({ _marketSigner })).to.be.rejectedWith(
                'EIP712WrapperInvalidSigner',
            );
        });

        it(`should fail if caller is not token contract`, async () => {
            const marketPermit: AuctionPermitStruct = {
                seller,
                tokenId,
                price,
                priceStep,
                endTime,
                participants,
                shares,
                deadline,
            };

            const signature = await signAuctionPermit(
                chainId,
                auctionAddr,
                marketPermit,
                auctionSigner,
            );

            await expect(
                auction.onERC721Received(
                    tokenOwnerAddr,
                    tokenOwnerAddr,
                    tokenId,
                    encodeAuctionPlaceParams(
                        price,
                        priceStep,
                        endTime,
                        deadline,
                        participants,
                        shares,
                        signature,
                    ),
                ),
            ).to.be.rejectedWith('TokenHolderUnauthorizedAccount');
        });
    });

    describe(`method 'raise'`, () => {
        beforeEach(placeOrder);

        it(`should set buyer if new price is equal to order price for first raise`, async () => {
            await raise({ orderId: 0, _price: price });

            const order = await auction.order(0);

            expect(order.buyer).equal(buyer1Addr);
            expect(order.price).equal(price);
        });

        it(`should set buyer and raise order price if new price is more than order price for first raise`, async () => {
            const _price = price + 10n;

            await raise({ orderId: 0, _price });

            const order = await auction.order(0);

            expect(order.buyer).equal(buyer1Addr);
            expect(order.price).equal(_price);
        });

        it(`should fail if new price is less than order price for first raise`, async () => {
            const _price = price - 10n;

            await expect(raise({ orderId: 0, _price })).to.be.rejectedWith('AuctionNotEnoughEther');
        });

        it(`should change buyer and raise order price if new price is equal to sum of order price and price step for second raise`, async () => {
            await raise({ orderId: 0, _price: price });

            const _auction = auction.connect(buyer2);
            const _price = price + priceStep;

            await raise({ orderId: 0, _price, _auction });

            const order = await auction.order(0);

            expect(order.buyer).equal(buyer2Addr);
            expect(order.price).equal(_price);
        });

        it(`should change buyer and raise order price if new price is more than sum of order price and price step for second raise`, async () => {
            await raise({ orderId: 0, _price: price });

            const _auction = auction.connect(buyer2);
            const _price = price + priceStep + 10n;

            await raise({ orderId: 0, _price, _auction });

            const order = await auction.order(0);

            expect(order.buyer).equal(buyer2Addr);
            expect(order.price).equal(_price);
        });

        it(`should fail if new price is less than sum of order price and price step for second raise`, async () => {
            await raise({ orderId: 0, _price: price });

            const _auction = auction.connect(buyer2);
            const _price = price - 10n;

            await expect(raise({ orderId: 0, _price, _auction })).to.be.rejectedWith(
                'AuctionNotEnoughEther',
            );
        });

        it(`should increase contract balance by new price for first raise`, async () => {
            await expect(() => raise({ orderId: 0, _price: price })).to.be.changeEtherBalances(
                [buyer1Addr, auctionAddr],
                [price * -1n, price],
            );
        });

        it(`should increase contract balance by difference of old and new price for second raise`, async () => {
            await raise({ orderId: 0, _price: price });

            const _auction = auction.connect(buyer2);
            const newPrice = price + priceStep;

            await expect(() =>
                raise({ orderId: 0, _price: newPrice, _auction }),
            ).to.be.changeEtherBalances(
                [buyer1Addr, buyer2Addr, auctionAddr],
                [price, newPrice * -1n, newPrice - price],
            );
        });

        it(`should send back ether to prev buyer`, async () => {
            await raise({ orderId: 0, _price: price });

            const _auction = auction.connect(buyer2);
            const newPrice = price + priceStep;

            await expect(() =>
                raise({ orderId: 0, _price: newPrice, _auction }),
            ).to.be.changeEtherBalances(
                [buyer1Addr, buyer2Addr, auctionAddr],
                [price, newPrice * -1n, newPrice - price],
            );
        });

        it(`should emit Raised event`, async () => {
            await expect(raise({ orderId: 0, _price: price }))
                .to.be.emit(auction, 'Raised')
                .withArgs(0, tokenId, buyer1Addr, price);
        });

        it(`should fail if order dose not exist`, async () => {
            await expect(raise({ orderId: 1, _price: price })).to.be.rejectedWith(
                'AuctionOrderNotPlaced',
            );
        });

        it(`should fail if auction is ended`, async () => {
            await setNextBlockTimestamp(endTime + 1);

            await expect(raise({ orderId: 0, _price: price })).to.be.rejectedWith(
                'AuctionTimeIsUp',
            );
        });

        it(`should fail if caller is seller`, async () => {
            const _auction = auction.connect(tokenOwner);

            await expect(raise({ orderId: 0, _price: price, _auction })).to.be.rejectedWith(
                'AuctionInvalidBuyer',
            );
        });
    });

    describe(`method 'end'`, () => {
        beforeEach(placeOrder);

        it(`should fail if order dose not exist`, async () => {
            await expect(end({ orderId: 1 })).to.be.rejectedWith('AuctionOrderNotPlaced');
        });

        it(`should fail if auction is still going`, async () => {
            await expect(end({ orderId: 0 })).to.be.rejectedWith('AuctionStillGoing');
        });

        describe(`if buyer dose not exist`, () => {
            beforeEach(() => setNextBlockTimestamp(endTime + 1));

            it(`should end if caller is random account`, async () => {
                await expect(end({ orderId: 0 }))
                    .to.be.emit(auction, 'Ended')
                    .withArgs(0, tokenId, ZeroAddress, tokenOwnerAddr, price);
            });

            it(`should transfer token back to seller`, async () => {
                await expect(end({ orderId: 0 }))
                    .to.be.emit(tokenMock, 'Transfer')
                    .withArgs(auctionAddr, tokenOwnerAddr, tokenId);
                await expect(tokenMock.ownerOf(tokenId)).to.eventually.equal(tokenOwnerAddr);
            });

            it(`should emit Ended event with correct args`, async () => {
                await expect(end({ orderId: 0 }))
                    .to.be.emit(auction, 'Ended')
                    .withArgs(0, tokenId, ZeroAddress, tokenOwnerAddr, price);
            });

            it(`should change order status`, async () => {
                await end({ orderId: 0 });

                const order = await auction.order(0);

                expect(order.status).equal(OrderStatus.Ended);
            });
        });

        describe(`if buyer exists`, () => {
            beforeEach(async () => {
                await raise({ orderId: 0, _price: price });

                await setNextBlockTimestamp(endTime + 1);
            });

            it(`should end if caller is random account`, async () => {
                await expect(end({ orderId: 0 }))
                    .to.be.emit(auction, 'Ended')
                    .withArgs(0, tokenId, buyer1Addr, tokenOwnerAddr, price);
            });

            it(`should transfer token to buyer`, async () => {
                await expect(end({ orderId: 0 }))
                    .to.be.emit(tokenMock, 'Transfer')
                    .withArgs(auctionAddr, buyer1Addr, tokenId);
                await expect(tokenMock.ownerOf(tokenId)).to.eventually.equal(buyer1Addr);
            });

            it(`should distribute ETH between participants according to shares`, async () => {
                await expect(end({ orderId: 0 })).to.be.changeEtherBalances(
                    [auctionAddr, ...participants],
                    [price * -1n, ...shares.map((share) => (price * share) / MAX_TOTAL_SHARE)],
                );
            });

            it(`should emit Ended event with correct args`, async () => {
                await expect(end({ orderId: 0 }))
                    .to.be.emit(auction, 'Ended')
                    .withArgs(0, tokenId, buyer1Addr, tokenOwnerAddr, price);
            });

            it(`should change order status`, async () => {
                await end({ orderId: 0 });

                const order = await auction.order(0);

                expect(order.status).equal(OrderStatus.Ended);
            });
        });
    });
});
