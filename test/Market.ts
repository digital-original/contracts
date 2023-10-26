import { ethers } from 'hardhat';
import { AbiCoder, Signer } from 'ethers';
import { setNextBlockTimestamp } from '@nomicfoundation/hardhat-network-helpers/dist/src/helpers/time';
import { expect } from 'chai';
import { deployClassic } from '../src/scripts/deploy-classic';
import { deployUpgradeable } from '../src/scripts/deploy-upgradable';
import { signMarketOrder } from '../src/scripts/eip712';
import { Market, TokenMock } from '../typechain-types';
import { OrderStruct } from '../src/typedefs';

describe('Market', function () {
    let market: Market;

    let tokenMock: TokenMock;

    let tokenBaseUri: string;

    let deployer: Signer;
    let platform: Signer;
    let marketSigner: Signer;
    let tokenOwner: Signer;
    let buyer: Signer;
    let randomAccount: Signer;

    let tokenOwnerAddress: string;
    let platformAddress: string;
    let buyerAddress: string;
    let randomAccountAddress: string;
    let marketAddress: string;

    let chainId: number;

    const maxTotalShare = 10_000n;

    enum OrderStatus {
        NotExists,
        Placed,
        Realized,
        Cancelled,
    }

    before(async () => {
        [deployer, platform, marketSigner, tokenOwner, buyer, randomAccount] =
            await ethers.getSigners();

        tokenOwnerAddress = await tokenOwner.getAddress();
        platformAddress = await platform.getAddress();
        randomAccountAddress = await randomAccount.getAddress();
        buyerAddress = await buyer.getAddress();

        tokenBaseUri = 'https://base-uri-mock/';

        const _tokenMock = await deployClassic({
            name: 'TokenMock',
            constructorArgs: [tokenBaseUri],
        });

        tokenMock = <any>_tokenMock;

        chainId = Number((await ethers.provider.getNetwork()).chainId);
    });

    beforeEach(async () => {
        const { proxyWithImpl: _market } = await deployUpgradeable({
            implName: 'Market',
            implConstructorArgs: [tokenMock, marketSigner],
            proxyAdminOwner: '0x0000000000000000000000000000000000000001',
        });

        market = await ethers.getContractAt('Market', _market);
        marketAddress = await market.getAddress();
    });

    it(`should have correct token`, async () => {
        const expected = await tokenMock.getAddress();
        await expect(market.TOKEN()).to.eventually.equal(expected);
    });

    it(`should have correct market signer`, async () => {
        const expected = await marketSigner.getAddress();
        await expect(market.MARKET_SIGNER()).to.eventually.equal(expected);
    });

    it(`should have correct order count`, async () => {
        await expect(market.orderCount()).to.eventually.equal(0n);
    });

    it(`should have correct maximum total share`, async () => {
        await expect(market.MAX_TOTAL_SHARE()).to.eventually.equal(maxTotalShare);
    });

    function safeTransferToMarket(
        from: string,
        tokenId: string,
        price: bigint,
        deadline: number,
        participants: string[],
        shares: bigint[],
        signature: string,
    ) {
        return tokenMock['safeTransferFrom(address,address,uint256,bytes)'](
            from,
            market,
            tokenId,
            AbiCoder.defaultAbiCoder().encode(
                ['uint256', 'uint256', 'address[]', 'uint256[]', 'bytes'],
                [price, deadline, participants, shares, signature],
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

            const signature = await signMarketOrder(chainId, marketAddress, order, marketSigner);

            await safeTransferToMarket(
                tokenOwnerAddress,
                tokenId,
                order.price,
                order.deadline,
                order.participants,
                order.shares,
                signature,
            );

            const placedOrder = await market.order(0);

            expect(placedOrder.seller).equal(tokenOwnerAddress);
            expect(placedOrder.tokenId.toString()).equal(order.tokenId);
            expect(placedOrder.price).equal(order.price);
            expect(placedOrder.status).equal(OrderStatus.Placed);
        });

        it(`should emit Placed event`, async () => {
            const orderId = 0;

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

            const signature = await signMarketOrder(chainId, marketAddress, order, marketSigner);

            await expect(
                safeTransferToMarket(
                    tokenOwnerAddress,
                    tokenId,
                    order.price,
                    order.deadline,
                    order.participants,
                    order.shares,
                    signature,
                ),
            )
                .to.emit(market, 'Placed')
                .withArgs(orderId, tokenId, tokenOwnerAddress, order.price);
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

            const signature = await signMarketOrder(chainId, marketAddress, order, marketSigner);

            await safeTransferToMarket(
                tokenOwnerAddress,
                tokenId,
                order.price,
                order.deadline,
                order.participants,
                order.shares,
                signature,
            );

            const orderCount = await market.orderCount();

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

            const signature = await signMarketOrder(chainId, marketAddress, order, marketSigner);

            await expect(
                market.onERC721Received(
                    tokenOwnerAddress,
                    tokenOwnerAddress,
                    tokenId,
                    AbiCoder.defaultAbiCoder().encode(
                        ['uint256', 'uint256', 'address[]', 'uint256[]', 'bytes'],
                        [order.price, order.deadline, order.participants, order.shares, signature],
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

            const signature = await signMarketOrder(chainId, marketAddress, order, marketSigner);

            setNextBlockTimestamp(deadline + 10);

            await expect(
                safeTransferToMarket(
                    tokenOwnerAddress,
                    tokenId,
                    order.price,
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

            const signature = await signMarketOrder(chainId, marketAddress, order, marketSigner);

            await expect(
                safeTransferToMarket(
                    tokenOwnerAddress,
                    tokenId,
                    order.price,
                    order.deadline,
                    order.participants,
                    order.shares,
                    signature,
                ),
            ).to.be.rejectedWith('BaseMarketInvalidSharesNumber');
        });

        it(`should fail if total shares isn't maximum total share`, async () => {
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

            const signature = await signMarketOrder(chainId, marketAddress, order, marketSigner);

            await expect(
                safeTransferToMarket(
                    tokenOwnerAddress,
                    tokenId,
                    order.price,
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

            const signature = await signMarketOrder(chainId, marketAddress, order, randomAccount);

            await expect(
                safeTransferToMarket(
                    tokenOwnerAddress,
                    tokenId,
                    order.price,
                    order.deadline,
                    order.participants,
                    order.shares,
                    signature,
                ),
            ).to.be.rejectedWith('MarketSignerUnauthorized');
        });
    });

    describe(`method 'realize'`, () => {
        let tokenId: string;
        let price: bigint;
        let participants: string[];
        let shares: bigint[];
        let orderId: string;

        beforeEach(async () => {
            tokenMock = tokenMock.connect(tokenOwner);

            tokenId = (await tokenMock.totalSupply()).toString();
            price = 100000n;
            participants = [platformAddress, tokenOwnerAddress, randomAccountAddress];
            shares = [4000n, 3500n, 2500n];
            orderId = '0';

            await tokenMock.mint(tokenOwner, tokenId);

            const block = await ethers.provider.getBlock('latest');
            const deadline = block!.timestamp + 100000000;

            const order = {
                seller: tokenOwnerAddress,
                tokenId,
                price,
                participants,
                shares,
                deadline,
            };

            const signature = await signMarketOrder(chainId, marketAddress, order, marketSigner);

            await safeTransferToMarket(
                tokenOwnerAddress,
                tokenId,
                order.price,
                order.deadline,
                order.participants,
                order.shares,
                signature,
            );

            market = market.connect(buyer);
            tokenMock = tokenMock.connect(buyer);
        });

        it(`should transfer token to buyer`, async () => {
            await expect(market.realize(orderId, { value: price }))
                .to.be.emit(tokenMock, 'Transfer')
                .withArgs(marketAddress, buyerAddress, tokenId);
            await expect(tokenMock.ownerOf(tokenId)).to.be.eventually.equal(buyerAddress);
        });

        it(`should distribute ETH between participants according to shares`, async () => {
            await expect(() => market.realize(orderId, { value: price })).to.be.changeEtherBalances(
                [buyer, ...participants],
                [
                    price * -1n,
                    (price * shares[0]) / maxTotalShare,
                    (price * shares[1]) / maxTotalShare,
                    (price * shares[2]) / maxTotalShare,
                ],
            );
        });

        it(`should change order status to Realized`, async () => {
            await market.realize(orderId, { value: price });

            const order = await market.order(orderId);

            expect(order.status).equal(OrderStatus.Realized);
        });

        it(`should emit Realized event`, async () => {
            await expect(market.realize(orderId, { value: price }))
                .to.be.emit(market, 'Realized')
                .withArgs(orderId, tokenId, buyerAddress, tokenOwnerAddress, price);
        });

        it(`should fail if invalid ether amount`, async () => {
            await expect(market.realize(orderId, { value: Number(price) - 1 })).to.be.rejectedWith(
                'MarketInvalidAmount',
            );
        });

        it(`should fail if order is already Realized`, async () => {
            await market.realize(orderId, { value: price });

            await expect(market.realize(orderId, { value: price })).to.be.rejectedWith(
                'BaseMarketOrderNotPlaced',
            );
        });

        it(`should fail if order is cancelled`, async () => {
            await market.connect(tokenOwner).cancel(orderId);

            await expect(market.realize(orderId, { value: price })).to.be.rejectedWith(
                'BaseMarketOrderNotPlaced',
            );
        });

        it(`should fail if order doesn't exist`, async () => {
            await expect(market.realize('1', { value: '123' })).to.be.rejectedWith(
                'BaseMarketOrderNotPlaced',
            );
        });
    });

    describe(`method 'cancel'`, () => {
        let tokenId: string;
        let price: bigint;
        let orderId: string;

        beforeEach(async () => {
            market = market.connect(tokenOwner);
            tokenMock = tokenMock.connect(tokenOwner);

            tokenId = (await tokenMock.totalSupply()).toString();
            price = 110000n;
            orderId = '0';

            await tokenMock.mint(tokenOwner, tokenId);

            const block = await ethers.provider.getBlock('latest');
            const deadline = block!.timestamp + 100000000;

            const order: OrderStruct = {
                seller: tokenOwnerAddress,
                tokenId,
                price: 110000n,
                participants: [tokenOwnerAddress],
                shares: [maxTotalShare],
                deadline,
            };

            const signature = await signMarketOrder(chainId, marketAddress, order, marketSigner);

            await safeTransferToMarket(
                tokenOwnerAddress,
                tokenId,
                order.price,
                order.deadline,
                order.participants,
                order.shares,
                signature,
            );
        });

        it(`should transfer token back to seller`, async () => {
            await expect(market.cancel(orderId))
                .to.be.emit(tokenMock, 'Transfer')
                .withArgs(marketAddress, tokenOwnerAddress, tokenId);
            await expect(tokenMock.ownerOf(tokenId)).to.be.eventually.equal(tokenOwnerAddress);
        });

        it(`should emit Cancelled event`, async () => {
            await expect(market.cancel(orderId))
                .to.be.emit(market, 'Cancelled')
                .withArgs(orderId, tokenId, tokenOwnerAddress);
        });

        it(`should change order status to Cancelled`, async () => {
            await market.cancel(orderId);

            const order = await market.order(orderId);

            expect(order.status).equal(OrderStatus.Cancelled);
        });

        it(`should fail if order doesn't exist`, async () => {
            await expect(market.cancel('11111')).to.be.rejectedWith(
                'BaseMarketOrderNotPlaced',
            );
        });

        it(`should fail if order is already cancelled`, async () => {
            await market.cancel(orderId);

            await expect(market.cancel(orderId)).to.be.rejectedWith(
                'BaseMarketOrderNotPlaced',
            );
        });

        it(`should fail if order is Realized`, async () => {
            await market.connect(buyer).realize(orderId, { value: price });

            await expect(market.cancel(orderId)).to.be.rejectedWith('BaseMarketOrderNotPlaced');
        });

        it(`should fail if caller is random account`, async () => {
            market = market.connect(randomAccount);

            await expect(market.cancel(orderId)).to.be.rejectedWith('MarketUnauthorizedAccount');
        });
    });
});
