import { ethers } from 'hardhat';
import { AbiCoder, Signer } from 'ethers';
import { setNextBlockTimestamp } from '@nomicfoundation/hardhat-network-helpers/dist/src/helpers/time';
import { expect } from 'chai';
import { deployClassic } from '../src/scripts/deploy-classic';
import { deployUpgradeable } from '../src/scripts/deploy-upgradable';
import { signAuctionOrder, signMarketOrder } from '../src/scripts/eip712';
import { Auction, TokenMock } from '../typechain-types';
import { OrderStruct } from '../src/typedefs';

describe('Auction', function () {
    let auction: Auction;

    let auctionAddress: string;

    let tokenMock: TokenMock;

    let tokenBaseUri: string;

    let deployer: Signer;
    let platform: Signer;
    let marketSigner: Signer;
    let tokenOwner: Signer;
    let buyer1: Signer;
    let buyer2: Signer;
    let randomAccount: Signer;

    let deployerAddress: string;
    let platformAddress: string;
    let marketSignerAddress: string;
    let tokenOwnerAddress: string;
    let buyer1Address: string;
    let buyer2Address: string;
    let randomAccountAddress: string;

    let chainId: number;

    const maxTotalShare = 10_000n;

    enum OrderStatus {
        NotExists,
        Placed,
        Ended,
    }

    before(async () => {
        [deployer, platform, marketSigner, tokenOwner, buyer1, buyer2, randomAccount] =
            await ethers.getSigners();

        [tokenOwnerAddress, platformAddress, randomAccountAddress, buyer1Address, buyer2Address] =
            await Promise.all([
                tokenOwner.getAddress(),
                platform.getAddress(),
                randomAccount.getAddress(),
                buyer1.getAddress(),
                buyer2.getAddress(),
            ]);

        tokenBaseUri = 'https://base-uri-mock/';

        const _tokenMock = await deployClassic({
            name: 'TokenMock',
            constructorArgs: [tokenBaseUri],
        });

        tokenMock = <any>_tokenMock;

        chainId = Number((await ethers.provider.getNetwork()).chainId);
    });

    beforeEach(async () => {
        const { proxy: _auction } = await deployUpgradeable({
            implName: 'Auction',
            implConstructorArgs: [tokenMock, marketSigner],
            proxyAdminOwner: '0x0000000000000000000000000000000000000001',
        });

        auction = await ethers.getContractAt('Auction', _auction);
        auctionAddress = await auction.getAddress();
    });

    it(`should have correct token`, async () => {
        const expected = await tokenMock.getAddress();
        await expect(auction.TOKEN()).to.eventually.equal(expected);
    });

    it(`should have correct market signer`, async () => {
        const expected = await marketSigner.getAddress();
        await expect(auction.MARKET_SIGNER()).to.eventually.equal(expected);
    });

    it(`should have correct order count`, async () => {
        await expect(auction.orderCount()).to.eventually.equal(0n);
    });

    it(`should have correct maximum total share`, async () => {
        await expect(auction.MAX_TOTAL_SHARE()).to.eventually.equal(maxTotalShare);
    });

    function safeTransferFrom(
        from: Signer,
        tokenId: string,
        price: bigint,
        priceStep: bigint,
        endTime: number,
        deadline: number,
        participants: string[],
        shares: bigint[],
        signature: string,
    ) {
        return tokenMock['safeTransferFrom(address,address,uint256,bytes)'](
            from,
            auction,
            tokenId,
            AbiCoder.defaultAbiCoder().encode(
                ['uint256', 'uint256', 'uint256', 'uint256', 'address[]', 'uint256[]', 'bytes'],
                [price, priceStep, endTime, deadline, participants, shares, signature],
            ),
        );
    }

    describe(`method 'onERC721Received'`, () => {
        let tokenId: string;

        beforeEach(async () => {
            tokenId = (await tokenMock.totalSupply()).toString();

            tokenMock = tokenMock.connect(tokenOwner);

            await tokenMock.mint(tokenOwner, tokenId);
        });

        it(`should place order if data and signature are valid`, async () => {
            const block = await ethers.provider.getBlock('latest');
            const deadline = block!.timestamp + 100000000;

            const order: OrderStruct = {
                seller: tokenOwnerAddress,
                tokenId,
                price: 100000n,
                participants: [tokenOwnerAddress, platformAddress],
                shares: [maxTotalShare / 2n, maxTotalShare / 2n],
                deadline,
            };

            const endTime = block!.timestamp + 100000000;
            const priceStep = 100n;

            const signature = await signAuctionOrder(chainId, auctionAddress, order, marketSigner);

            await safeTransferFrom(
                tokenOwner,
                tokenId,
                order.price,
                priceStep,
                endTime,
                order.deadline,
                order.participants,
                order.shares,
                signature,
            );

            const placedOrder = await auction.order(0);

            expect(placedOrder.seller).equal(tokenOwnerAddress);
            expect(placedOrder.tokenId.toString()).equal(order.tokenId);
            expect(placedOrder.price.toString()).equal(order.price);
            expect(placedOrder.status).equal(OrderStatus.Placed);
        });

        it(`should emit Placed event`, async () => {
            const orderId = '0';

            const block = await ethers.provider.getBlock('latest');
            const deadline = block!.timestamp + 100000000;

            const order: OrderStruct = {
                seller: tokenOwnerAddress,
                tokenId,
                price: 100000n,
                participants: [tokenOwnerAddress, platformAddress],
                shares: [maxTotalShare / 2n, maxTotalShare / 2n],
                deadline,
            };

            const endTime = block!.timestamp + 100000000;
            const priceStep = 100n;

            const signature = await signAuctionOrder(chainId, auctionAddress, order, marketSigner);

            await expect(
                safeTransferFrom(
                    tokenOwner,
                    tokenId,
                    order.price,
                    priceStep,
                    endTime,
                    order.deadline,
                    order.participants,
                    order.shares,
                    signature,
                ),
            )
                .to.emit(auction, 'Placed')
                .withArgs(orderId, tokenId, tokenOwnerAddress, order.price, priceStep, endTime);
        });

        it(`should increase order count`, async () => {
            const block = await ethers.provider.getBlock('latest');
            const deadline = block!.timestamp + 100000000;

            const order: OrderStruct = {
                seller: tokenOwnerAddress,
                tokenId,
                price: 100000n,
                participants: [tokenOwnerAddress, platformAddress],
                shares: [maxTotalShare / 2n, maxTotalShare / 2n],
                deadline,
            };

            const endTime = block!.timestamp + 100000000;
            const priceStep = 100n;

            const signature = await signAuctionOrder(chainId, auctionAddress, order, marketSigner);

            await safeTransferFrom(
                tokenOwner,
                tokenId,
                order.price,
                priceStep,
                endTime,
                order.deadline,
                order.participants,
                order.shares,
                signature,
            );

            const orderCount = await auction.orderCount();

            expect(orderCount.toString()).equal('1');
        });

        it(`should fail if caller isn't token contract`, async () => {
            const block = await ethers.provider.getBlock('latest');
            const deadline = block!.timestamp + 100000000;

            const order: OrderStruct = {
                seller: tokenOwnerAddress,
                tokenId,
                price: 100000n,
                participants: [tokenOwnerAddress, platformAddress],
                shares: [maxTotalShare / 2n, maxTotalShare / 2n],
                deadline,
            };

            const endTime = block!.timestamp + 100000000;
            const priceStep = 100n;

            const signature = await signAuctionOrder(chainId, auctionAddress, order, marketSigner);

            await expect(
                auction.onERC721Received(
                    tokenOwner,
                    tokenOwner,
                    tokenId,
                    AbiCoder.defaultAbiCoder().encode(
                        [
                            'uint256',
                            'uint256',
                            'uint256',
                            'uint256',
                            'address[]',
                            'uint256[]',
                            'bytes',
                        ],
                        [
                            order.price,
                            priceStep,
                            endTime,
                            deadline,
                            order.participants,
                            order.shares,
                            signature,
                        ],
                    ),
                ),
            ).to.be.rejectedWith('BaseMarketUnauthorizedAccount');
        });

        it(`should fail if signature is expired`, async () => {
            const block = await ethers.provider.getBlock('latest');
            const deadline = block!.timestamp + 100000000;

            const order: OrderStruct = {
                seller: tokenOwnerAddress,
                tokenId,
                price: 100000n,
                participants: [tokenOwnerAddress, platformAddress],
                shares: [maxTotalShare / 2n, maxTotalShare / 2n],
                deadline,
            };

            const endTime = block!.timestamp + 100000000000;
            const priceStep = 100n;

            const signature = await signAuctionOrder(chainId, auctionAddress, order, marketSigner);

            await setNextBlockTimestamp(deadline + 10);

            await expect(
                safeTransferFrom(
                    tokenOwner,
                    tokenId,
                    order.price,
                    priceStep,
                    endTime,
                    order.deadline,
                    order.participants,
                    order.shares,
                    signature,
                ),
            ).to.be.rejectedWith('MarketSignerSignatureExpired');
        });

        it(`should fail if number of participants isn't equal number of shares`, async () => {
            const block = await ethers.provider.getBlock('latest');
            const deadline = block!.timestamp + 100000000;

            const order: OrderStruct = {
                seller: tokenOwnerAddress,
                tokenId,
                price: 100000n,
                participants: [tokenOwnerAddress, platformAddress, tokenOwnerAddress],
                shares: [maxTotalShare / 2n, maxTotalShare / 2n],
                deadline,
            };

            const endTime = block!.timestamp + 100000000000;
            const priceStep = 100n;

            const signature = await signAuctionOrder(chainId, auctionAddress, order, marketSigner);

            await expect(
                safeTransferFrom(
                    tokenOwner,
                    tokenId,
                    order.price,
                    priceStep,
                    endTime,
                    order.deadline,
                    order.participants,
                    order.shares,
                    signature,
                ),
            ).to.be.rejectedWith('BaseMarketInvalidSharesNumber');
        });

        it(`should fail if total shares isn't equal maximum total share`, async () => {
            const block = await ethers.provider.getBlock('latest');
            const deadline = block!.timestamp + 100000000;

            const order: OrderStruct = {
                seller: tokenOwnerAddress,
                tokenId,
                price: 100000n,
                participants: [tokenOwnerAddress, platformAddress, tokenOwnerAddress],
                shares: [maxTotalShare / 3n, maxTotalShare / 3n, maxTotalShare / 3n],
                deadline,
            };

            const endTime = block!.timestamp + 100000000000;
            const priceStep = 100n;

            const signature = await signAuctionOrder(chainId, auctionAddress, order, marketSigner);

            await expect(
                safeTransferFrom(
                    tokenOwner,
                    tokenId,
                    order.price,
                    priceStep,
                    endTime,
                    order.deadline,
                    order.participants,
                    order.shares,
                    signature,
                ),
            ).to.be.rejectedWith('BaseMarketInvalidSharesSum');
        });

        it(`should fail if market signer is invalid`, async () => {
            const block = await ethers.provider.getBlock('latest');
            const deadline = block!.timestamp + 100000000;

            const order: OrderStruct = {
                seller: tokenOwnerAddress,
                tokenId,
                price: 100000n,
                participants: [tokenOwnerAddress, platformAddress, tokenOwnerAddress],
                shares: [maxTotalShare / 3n, maxTotalShare / 3n, maxTotalShare / 3n],
                deadline,
            };

            const endTime = block!.timestamp + 100000000000;
            const priceStep = 100n;

            const signature = await signAuctionOrder(chainId, auctionAddress, order, randomAccount);

            await expect(
                safeTransferFrom(
                    tokenOwner,
                    tokenId,
                    order.price,
                    priceStep,
                    endTime,
                    order.deadline,
                    order.participants,
                    order.shares,
                    signature,
                ),
            ).to.be.rejectedWith('MarketSignerUnauthorized');
        });

        it(`should fail if end time isn't more than current time`, async () => {
            const block = await ethers.provider.getBlock('latest');
            const deadline = block!.timestamp + 10000000000;

            const order: OrderStruct = {
                seller: tokenOwnerAddress,
                tokenId,
                price: 100000n,
                participants: [tokenOwnerAddress, platformAddress],
                shares: [maxTotalShare / 2n, maxTotalShare / 2n],
                deadline,
            };

            const endTime = block!.timestamp + 100000;
            const priceStep = 100n;

            const signature = await signAuctionOrder(chainId, auctionAddress, order, marketSigner);

            await setNextBlockTimestamp(endTime + 10);

            await expect(
                safeTransferFrom(
                    tokenOwner,
                    tokenId,
                    order.price,
                    priceStep,
                    endTime,
                    order.deadline,
                    order.participants,
                    order.shares,
                    signature,
                ),
            ).to.be.rejectedWith('AuctionInvalidEndTime');
        });
    });

    describe(`method 'raise'`, () => {
        let tokenId: string;
        let price: bigint;
        let priceStep: bigint;
        let endTime: number;
        let participants: string[];
        let shares: bigint[];
        let orderId: string;

        beforeEach(async () => {
            tokenMock = tokenMock.connect(tokenOwner);

            const block = await ethers.provider.getBlock('latest');
            const deadline = block!.timestamp + 100000000;

            tokenId = (await tokenMock.totalSupply()).toString();
            price = 100000n;
            priceStep = 100n;
            endTime = block!.timestamp + 100000000;
            participants = [tokenOwnerAddress, platformAddress];
            shares = [maxTotalShare / 2n, maxTotalShare / 2n];
            orderId = '0';

            await tokenMock.mint(tokenOwner, tokenId);

            const order: OrderStruct = {
                seller: tokenOwnerAddress,
                tokenId,
                price,
                participants,
                shares,
                deadline,
            };

            const signature = await signAuctionOrder(chainId, auctionAddress, order, marketSigner);

            await safeTransferFrom(
                tokenOwner,
                tokenId,
                order.price,
                priceStep,
                endTime,
                order.deadline,
                order.participants,
                order.shares,
                signature,
            );

            auction = auction.connect(buyer1);
            tokenMock = tokenMock.connect(buyer1);
        });

        it(`should set buyer if new price equal is order price for first raise`, async () => {
            await auction.raise(orderId, { value: price });

            const order = await auction.order(orderId);

            expect(order.buyer).equal(buyer1Address);
            expect(order.price).equal(price);
        });

        it(`should set buyer and raise order price if new price is more than order price for first raise`, async () => {
            price = price + 100n;

            await auction.raise(orderId, { value: price });

            const order = await auction.order(orderId);

            expect(order.buyer).equal(buyer1Address);
            expect(order.price).equal(price);
        });

        it(`should increase contract balance`, async () => {
            price = price + priceStep;

            await expect(() => auction.raise(orderId, { value: price })).to.be.changeEtherBalances(
                [buyer1Address, auctionAddress],
                [price * -1n, price],
            );
        });

        it(`should change contract balance by price difference for seconds raise`, async () => {
            await auction.raise(orderId, { value: price });

            auction = auction.connect(buyer2);

            const order = await auction.order(orderId);

            const newValue = order.price + priceStep;

            await expect(() =>
                auction.raise(orderId, { value: newValue }),
            ).to.be.changeEtherBalances(
                [buyer2Address, auctionAddress],
                [newValue * -1n, priceStep],
            );
        });

        it(`should change buyer`, async () => {
            await auction.raise(orderId, { value: price });

            auction = auction.connect(buyer2);

            const order = await auction.order(orderId);

            price = order.price + priceStep;

            await auction.raise(orderId, { value: price });

            const updatedOrder = await auction.order(orderId);

            expect(updatedOrder.buyer).equal(buyer2Address);
        });

        it(`should send back ether to prev buyer`, async () => {
            await auction.raise(orderId, { value: price });

            auction = auction.connect(buyer2);

            const order = await auction.order(orderId);

            price = order.price + priceStep;

            await expect(() => auction.raise(orderId, { value: price })).to.be.changeEtherBalances(
                [buyer2Address, auctionAddress, buyer1Address],
                [price * -1n, priceStep, price - priceStep],
            );
        });

        it(`should emit Raised event`, async () => {
            await expect(auction.raise(orderId, { value: price }))
                .to.be.emit(auction, 'Raised')
                .withArgs(orderId, tokenId, buyer1Address, price);
        });

        it(`should fail if order doesn't exist`, async () => {
            await expect(auction.raise('1234', { value: price })).to.be.rejectedWith(
                'BaseMarketOrderNotPlaced',
            );
        });

        it(`should fail if auction is ended`, async () => {
            await setNextBlockTimestamp(endTime + 1);

            await expect(auction.raise(orderId, { value: price })).to.be.rejectedWith(
                'AuctionTimeIsUp',
            );
        });

        it(`should fail if caller is seller`, async () => {
            auction = auction.connect(tokenOwner);

            await expect(auction.raise(orderId, { value: price })).to.be.rejectedWith(
                'AuctionInvalidBuyer',
            );
        });

        it(`should fail if sent ether amount isn't enough `, async () => {
            price = price - 1n;

            await expect(auction.raise(orderId, { value: price })).to.be.rejectedWith(
                'AuctionNotEnoughEther',
            );
        });
    });

    describe(`method 'end'`, () => {
        let tokenId: string;
        let price: bigint;
        let priceStep: bigint;
        let endTime: number;
        let participants: string[];
        let shares: bigint[];
        let orderId: string;

        beforeEach(async () => {
            tokenMock = tokenMock.connect(tokenOwner);

            const block = await ethers.provider.getBlock('latest');
            const deadline = block!.timestamp + 100000000;

            tokenId = (await tokenMock.totalSupply()).toString();
            price = 100000n;
            priceStep = 100n;
            endTime = block!.timestamp + 100000000;
            participants = [tokenOwnerAddress, platformAddress, randomAccountAddress];
            shares = [
                maxTotalShare / 3n,
                maxTotalShare / 3n,
                maxTotalShare - 2n * (maxTotalShare / 3n),
            ];
            orderId = '0';

            await tokenMock.mint(tokenOwnerAddress, tokenId);

            const order: OrderStruct = {
                seller: tokenOwnerAddress,
                tokenId,
                price,
                participants,
                shares,
                deadline,
            };

            const signature = await signAuctionOrder(chainId, auctionAddress, order, marketSigner);

            await safeTransferFrom(
                tokenOwner,
                tokenId,
                order.price,
                priceStep,
                endTime,
                order.deadline,
                order.participants,
                order.shares,
                signature,
            );

            auction = auction.connect(buyer1);
        });

        it(`should fail if order doesn't exist`, async () => {
            await expect(auction.end('1234')).to.be.rejectedWith('BaseMarketOrderNotPlaced');
        });

        it(`should fail if auction is still going`, async () => {
            await expect(auction.end(orderId)).to.be.rejectedWith('AuctionStillGoing');
        });

        it(`should emit Ended event`, async () => {
            await setNextBlockTimestamp(endTime + 1);

            const order = await auction.order(orderId);

            await expect(auction.end(orderId))
                .to.be.emit(auction, 'Ended')
                .withArgs(orderId, tokenId, order.buyer, tokenOwnerAddress, price);
        });

        describe(`if buyer doesn't exist`, () => {
            beforeEach(async () => {
                await setNextBlockTimestamp(endTime + 1);
            });

            it(`should transfer token back to seller`, async () => {
                await expect(auction.end(orderId))
                    .to.be.emit(tokenMock, 'Transfer')
                    .withArgs(auctionAddress, tokenOwnerAddress, tokenId);
                await expect(tokenMock.ownerOf(tokenId)).to.eventually.equal(tokenOwnerAddress);
            });
        });

        describe(`if buyer exists`, () => {
            beforeEach(async () => {
                await auction.raise(orderId, { value: price });

                await setNextBlockTimestamp(endTime + 1);
            });

            it(`should transfer token to buyer`, async () => {
                await expect(auction.end(orderId))
                    .to.be.emit(tokenMock, 'Transfer')
                    .withArgs(auctionAddress, buyer1Address, tokenId);
                await expect(tokenMock.ownerOf(tokenId)).to.eventually.equal(buyer1Address);
            });

            it(`should distribute ETH between participants according to shares`, async () => {
                const values: bigint[] = [];

                let released = 0n;

                for (let i = 0; i < shares.length - 1; i++) {
                    const value = (price * shares[i]) / maxTotalShare;

                    released = released + value;

                    values.push(value);
                }

                values.push(price - released);

                await expect(() => auction.end(orderId)).to.be.changeEtherBalances(
                    [auctionAddress, ...participants],
                    [price * -1n, ...values],
                );
            });
        });
    });
});
