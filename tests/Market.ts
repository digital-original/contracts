import { expect } from 'chai';
import { Signer, MaxInt256, randomBytes } from 'ethers';
import { ArtToken, Market, USDC } from '../typechain-types';
import {
    AskOrder,
    BidOrder,
    OrderExecutionPermit,
} from '../typechain-types/contracts/market/IMarket';
import { BuyPermitStruct } from '../types/art-token';
import { TOTAL_SHARE } from './constants/distribution';
import { TOKEN_ID, TOKEN_URI } from './constants/art-token';
import { MIN_FEE, MIN_PRICE } from './constants/min-price-and-fee';
import { HOUR } from './constants/time';
import { getSigners } from './utils/get-signers';
import { getLatestBlockTimestamp } from './utils/get-latest-block-timestamp';
import { deployProtocolTest } from './utils/deploy-protocol-test';
import { MarketUtils } from './utils/market-utils';
import { ArtTokenUtils } from './utils/art-token-utils';

describe('Market', function () {
    let market: Market, marketAddr: string;
    let artToken: ArtToken, artTokenAddr: string;
    let usdc: USDC, usdcAddr: string;

    let marketSigner: Signer, marketSignerAddr: string;
    let financier: Signer, financierAddr: string;
    let marketAdmin: Signer, marketAdminAddr: string;
    let institution: Signer, institutionAddr: string;
    let maker: Signer, makerAddr: string;
    let taker: Signer, takerAddr: string;
    let randomAccount: Signer, randomAccountAddr: string;

    before(async () => {
        [
            [marketSigner, financier, marketAdmin, institution, maker, taker, randomAccount],
            [
                marketSignerAddr,
                financierAddr,
                marketAdminAddr,
                institutionAddr,
                makerAddr,
                takerAddr,
                randomAccountAddr,
            ],
        ] = await getSigners();
    });

    beforeEach(async () => {
        const protocol = await deployProtocolTest({
            signer: marketSigner,
            financier,
            admin: marketAdmin,
        });

        market = protocol.market;
        marketAddr = protocol.marketAddr;
        artToken = protocol.artToken;
        artTokenAddr = protocol.artTokenAddr;
        usdc = protocol.usdc;
        usdcAddr = protocol.usdcAddr;
    });

    describe(`method 'executeAsk'`, () => {
        beforeEach(async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();

            const buyPermit: BuyPermitStruct = {
                tokenId: TOKEN_ID,
                tokenURI: TOKEN_URI,
                sender: makerAddr,
                price: MIN_PRICE,
                fee: MIN_FEE,
                participants: [institutionAddr],
                shares: [TOTAL_SHARE],
                deadline: latestBlockTimestamp + HOUR,
            };

            await usdc.connect(maker).mintAndApprove(artToken, MaxInt256);

            await ArtTokenUtils.buy({
                artToken,
                permit: buyPermit,
                permitSigner: marketSigner,
                sender: maker,
            });

            await artToken.connect(maker).approve(marketAddr, TOKEN_ID);

            await usdc.connect(taker).mintAndApprove(marketAddr, MaxInt256);
        });

        it(`should execute the order`, async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();

            const price = MIN_PRICE;
            const fee = await market.bidFee(price);

            const makerShare = TOTAL_SHARE / 2n; // 50%
            const institutionShare = (TOTAL_SHARE / 5n) * 2n; // 40%
            const platformShare = TOTAL_SHARE / 10n; // 10%

            const order: AskOrder.TypeStruct = {
                collection: artTokenAddr,
                currency: usdcAddr,
                maker: makerAddr,
                tokenId: TOKEN_ID,
                price,
                makerShare,
                startTime: latestBlockTimestamp,
                endTime: latestBlockTimestamp + HOUR,
            };

            const permit: OrderExecutionPermit.TypeStruct = {
                participants: [institutionAddr, financierAddr],
                shares: [institutionShare, platformShare],
                deadline: latestBlockTimestamp + HOUR,
            };

            const orderHash = MarketUtils.hashAskOrder(order);

            const tx = await MarketUtils.executeAsk({
                market,
                order,
                permit,
                orderSigner: maker,
                permitSigner: marketSigner,
                sender: taker,
            });

            await expect(tx)
                .to.be.emit(usdc, 'Transfer')
                .withArgs(takerAddr, marketAddr, price + fee);

            await expect(tx)
                .to.be.emit(usdc, 'Transfer') //
                .withArgs(marketAddr, financierAddr, fee);

            await expect(tx)
                .to.be.emit(usdc, 'Transfer')
                .withArgs(marketAddr, makerAddr, (price * makerShare) / TOTAL_SHARE);

            await expect(tx)
                .to.be.emit(usdc, 'Transfer')
                .withArgs(marketAddr, institutionAddr, (price * institutionShare) / TOTAL_SHARE);

            await expect(tx)
                .to.be.emit(usdc, 'Transfer')
                .withArgs(marketAddr, financierAddr, (price * platformShare) / TOTAL_SHARE);

            await expect(tx)
                .to.be.emit(artToken, 'Transfer') //
                .withArgs(makerAddr, takerAddr, TOKEN_ID);

            await expect(tx)
                .to.be.emit(market, 'AskOrderExecuted')
                .withArgs(orderHash, makerAddr, takerAddr, price, TOKEN_ID);

            await expect(market.orderInvalidated(maker, orderHash)).to.eventually.equal(true);
        });

        it(`should send the remaining share to maker`, async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();

            const price = MIN_PRICE;

            const makerShare = 0n;
            const institutionShare = (TOTAL_SHARE / 5n) * 2n;
            const platformShare = TOTAL_SHARE / 10n;
            const remainingShare = TOTAL_SHARE - institutionShare - platformShare;

            const order: AskOrder.TypeStruct = {
                collection: artTokenAddr,
                currency: usdcAddr,
                maker: makerAddr,
                tokenId: TOKEN_ID,
                price,
                makerShare,
                startTime: latestBlockTimestamp,
                endTime: latestBlockTimestamp + HOUR,
            };

            const permit: OrderExecutionPermit.TypeStruct = {
                participants: [institutionAddr, financierAddr],
                shares: [institutionShare, platformShare],
                deadline: latestBlockTimestamp + HOUR,
            };

            const tx = await MarketUtils.executeAsk({
                market,
                order,
                permit,
                orderSigner: maker,
                permitSigner: marketSigner,
                sender: taker,
            });

            await expect(tx)
                .to.be.emit(usdc, 'Transfer')
                .withArgs(marketAddr, makerAddr, (price * remainingShare) / TOTAL_SHARE);

            await expect(tx)
                .to.be.emit(usdc, 'Transfer')
                .withArgs(marketAddr, institutionAddr, (price * institutionShare) / TOTAL_SHARE);

            await expect(tx)
                .to.be.emit(usdc, 'Transfer')
                .withArgs(marketAddr, financierAddr, (price * platformShare) / TOTAL_SHARE);
        });

        it(`should fail if the order start time is greater than the current time`, async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();

            const startTime = latestBlockTimestamp + HOUR * 2;
            const endTime = latestBlockTimestamp + HOUR * 10;

            const order: AskOrder.TypeStruct = {
                collection: artTokenAddr,
                currency: usdcAddr,
                maker: makerAddr,
                tokenId: TOKEN_ID,
                price: MIN_PRICE,
                makerShare: TOTAL_SHARE / 2n,
                startTime,
                endTime,
            };

            const permit: OrderExecutionPermit.TypeStruct = {
                participants: [institutionAddr],
                shares: [TOTAL_SHARE / 2n],
                deadline: latestBlockTimestamp + HOUR,
            };

            const tx = MarketUtils.executeAsk({
                market,
                order,
                permit,
                orderSigner: maker,
                permitSigner: marketSigner,
                sender: taker,
            });

            await expect(tx).to.eventually.rejectedWith('MarketOrderOutsideOfTimeRange');
        });

        it(`should fail if the order end time is smaller than the current time`, async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();

            const startTime = latestBlockTimestamp - HOUR * 3;
            const endTime = latestBlockTimestamp - HOUR;

            const order: AskOrder.TypeStruct = {
                collection: artTokenAddr,
                currency: usdcAddr,
                maker: makerAddr,
                tokenId: TOKEN_ID,
                price: MIN_PRICE,
                makerShare: TOTAL_SHARE / 2n,
                startTime,
                endTime,
            };

            const permit: OrderExecutionPermit.TypeStruct = {
                participants: [institutionAddr],
                shares: [TOTAL_SHARE / 2n],
                deadline: latestBlockTimestamp + HOUR,
            };

            const tx = MarketUtils.executeAsk({
                market,
                order,
                permit,
                orderSigner: maker,
                permitSigner: marketSigner,
                sender: taker,
            });

            await expect(tx).to.eventually.rejectedWith('MarketOrderOutsideOfTimeRange');
        });

        it(`should fail if the order signer is not the maker`, async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();

            const order: AskOrder.TypeStruct = {
                collection: artTokenAddr,
                currency: usdcAddr,
                maker: makerAddr,
                tokenId: TOKEN_ID,
                price: MIN_PRICE,
                makerShare: TOTAL_SHARE / 2n,
                startTime: latestBlockTimestamp,
                endTime: latestBlockTimestamp + HOUR,
            };

            const permit: OrderExecutionPermit.TypeStruct = {
                participants: [institutionAddr],
                shares: [TOTAL_SHARE / 2n],
                deadline: latestBlockTimestamp + HOUR,
            };

            const tx = MarketUtils.executeAsk({
                market,
                order,
                permit,
                orderSigner: randomAccount,
                permitSigner: marketSigner,
                sender: taker,
            });

            await expect(tx).to.eventually.rejectedWith('MarketUnauthorizedOrder');
        });

        it(`should fail if the permit order hash and the order hash do not match`, async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();

            const order: AskOrder.TypeStruct = {
                collection: artTokenAddr,
                currency: usdcAddr,
                maker: makerAddr,
                tokenId: TOKEN_ID,
                price: MIN_PRICE,
                makerShare: TOTAL_SHARE / 2n,
                startTime: latestBlockTimestamp,
                endTime: latestBlockTimestamp + HOUR,
            };

            const permit: OrderExecutionPermit.TypeStruct = {
                participants: [institutionAddr],
                shares: [TOTAL_SHARE / 2n],
                deadline: latestBlockTimestamp + HOUR,
            };

            const orderHash = MarketUtils.hashAskOrder({ ...order, tokenId: 0 });

            const tx = MarketUtils.executeAsk({
                market,
                order,
                permit: { ...permit, orderHash },
                orderSigner: maker,
                permitSigner: marketSigner,
                sender: taker,
            });

            await expect(tx).to.eventually.rejectedWith('AuthorizationUnauthorizedAction');
        });

        it(`should fail if the permit signer is not the market signer`, async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();

            const order: AskOrder.TypeStruct = {
                collection: artTokenAddr,
                currency: usdcAddr,
                maker: makerAddr,
                tokenId: TOKEN_ID,
                price: MIN_PRICE,
                makerShare: TOTAL_SHARE / 2n,
                startTime: latestBlockTimestamp,
                endTime: latestBlockTimestamp + HOUR,
            };

            const permit: OrderExecutionPermit.TypeStruct = {
                participants: [institutionAddr],
                shares: [TOTAL_SHARE / 2n],
                deadline: latestBlockTimestamp + HOUR,
            };

            const tx = MarketUtils.executeAsk({
                market,
                order,
                permit,
                orderSigner: maker,
                permitSigner: randomAccount,
                sender: taker,
            });

            await expect(tx).to.eventually.rejectedWith('AuthorizationUnauthorizedAction');
        });

        it(`should fail if the order is invalidated`, async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();

            const order: AskOrder.TypeStruct = {
                collection: artTokenAddr,
                currency: usdcAddr,
                maker: makerAddr,
                tokenId: TOKEN_ID,
                price: MIN_PRICE,
                makerShare: TOTAL_SHARE / 2n,
                startTime: latestBlockTimestamp,
                endTime: latestBlockTimestamp + HOUR,
            };

            const permit: OrderExecutionPermit.TypeStruct = {
                participants: [institutionAddr],
                shares: [TOTAL_SHARE / 2n],
                deadline: latestBlockTimestamp + HOUR,
            };

            const orderHash = MarketUtils.hashAskOrder(order);

            await market.connect(maker).invalidateOrder(makerAddr, orderHash);

            const tx = MarketUtils.executeAsk({
                market,
                order,
                permit,
                orderSigner: maker,
                permitSigner: marketSigner,
                sender: taker,
            });

            await expect(tx).to.eventually.rejectedWith('MarketOrderInvalidated');
        });

        it(`should fail if the remaining share is lower than the maker share`, async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();

            const makerShare = TOTAL_SHARE / 2n; // 50%
            const institutionShare = (TOTAL_SHARE / 5n) * 2n; // 40%
            const platformShare = TOTAL_SHARE / 5n; // 20%

            const order: AskOrder.TypeStruct = {
                collection: artTokenAddr,
                currency: usdcAddr,
                maker: makerAddr,
                tokenId: TOKEN_ID,
                price: MIN_PRICE,
                makerShare,
                startTime: latestBlockTimestamp,
                endTime: latestBlockTimestamp + HOUR,
            };

            const permit: OrderExecutionPermit.TypeStruct = {
                participants: [institutionAddr, financierAddr],
                shares: [institutionShare, platformShare],
                deadline: latestBlockTimestamp + HOUR,
            };

            const tx = MarketUtils.executeAsk({
                market,
                order,
                permit,
                orderSigner: maker,
                permitSigner: marketSigner,
                sender: taker,
            });

            await expect(tx).to.eventually.rejectedWith('MarketRemainingShareTooLow(4000)');
        });
    });

    describe(`method 'executeBid'`, () => {
        beforeEach(async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();

            const buyPermit: BuyPermitStruct = {
                tokenId: TOKEN_ID,
                tokenURI: TOKEN_URI,
                sender: takerAddr,
                price: MIN_PRICE,
                fee: MIN_FEE,
                participants: [institutionAddr],
                shares: [TOTAL_SHARE],
                deadline: latestBlockTimestamp + HOUR,
            };

            await usdc.connect(taker).mintAndApprove(artToken, MaxInt256);

            await ArtTokenUtils.buy({
                artToken,
                permit: buyPermit,
                permitSigner: marketSigner,
                sender: taker,
            });

            await artToken.connect(taker).approve(marketAddr, TOKEN_ID);

            await usdc.connect(maker).mintAndApprove(marketAddr, MaxInt256);
        });

        it(`should execute the order`, async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();

            const price = MIN_PRICE;
            const makerFee = await market.bidFee(price);

            const makerShare = TOTAL_SHARE / 2n; // 50%
            const institutionShare = (TOTAL_SHARE / 5n) * 2n; // 40%
            const platformShare = TOTAL_SHARE / 10n; // 10%

            const order: BidOrder.TypeStruct = {
                collection: artTokenAddr,
                currency: usdcAddr,
                maker: makerAddr,
                tokenId: TOKEN_ID,
                price,
                makerFee,
                startTime: latestBlockTimestamp,
                endTime: latestBlockTimestamp + HOUR,
            };

            const orderHash = MarketUtils.hashBidOrder(order);

            const permit: OrderExecutionPermit.TypeStruct = {
                participants: [institutionAddr, financierAddr],
                shares: [institutionShare, platformShare],
                deadline: latestBlockTimestamp + HOUR,
            };

            const tx = await MarketUtils.executeBid({
                market,
                order,
                permit,
                orderSigner: maker,
                permitSigner: marketSigner,
                sender: taker,
            });

            await expect(tx)
                .to.be.emit(usdc, 'Transfer')
                .withArgs(makerAddr, marketAddr, price + makerFee);

            await expect(tx)
                .to.be.emit(usdc, 'Transfer') //
                .withArgs(marketAddr, financierAddr, makerFee);

            await expect(tx)
                .to.be.emit(usdc, 'Transfer')
                .withArgs(marketAddr, takerAddr, (price * makerShare) / TOTAL_SHARE);

            await expect(tx)
                .to.be.emit(usdc, 'Transfer')
                .withArgs(marketAddr, institutionAddr, (price * institutionShare) / TOTAL_SHARE);

            await expect(tx)
                .to.be.emit(usdc, 'Transfer')
                .withArgs(marketAddr, financierAddr, (price * platformShare) / TOTAL_SHARE);

            await expect(tx)
                .to.be.emit(artToken, 'Transfer') //
                .withArgs(takerAddr, makerAddr, TOKEN_ID);

            await expect(tx)
                .to.be.emit(market, 'BidOrderExecuted')
                .withArgs(orderHash, makerAddr, takerAddr, price, TOKEN_ID);

            await expect(market.orderInvalidated(maker, orderHash)).to.eventually.equal(true);
        });

        it(`should charge the calculated fee to the maker`, async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();

            const price = MIN_PRICE;
            const makerFee = price;
            const calculatedFee = await market.bidFee(price);

            const order: BidOrder.TypeStruct = {
                collection: artTokenAddr,
                currency: usdcAddr,
                maker: makerAddr,
                tokenId: TOKEN_ID,
                price,
                makerFee,
                startTime: latestBlockTimestamp,
                endTime: latestBlockTimestamp + HOUR,
            };

            const permit: OrderExecutionPermit.TypeStruct = {
                participants: [institutionAddr, financierAddr],
                shares: [(TOTAL_SHARE / 5n) * 2n, TOTAL_SHARE / 10n],
                deadline: latestBlockTimestamp + HOUR,
            };

            const tx = await MarketUtils.executeBid({
                market,
                order,
                permit,
                orderSigner: maker,
                permitSigner: marketSigner,
                sender: taker,
            });

            await expect(tx)
                .to.be.emit(usdc, 'Transfer')
                .withArgs(makerAddr, marketAddr, price + calculatedFee);
        });

        it(`should fail if the order start time is greater than the current time`, async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();

            const startTime = latestBlockTimestamp + HOUR * 2;
            const endTime = latestBlockTimestamp + HOUR * 10;

            const order: BidOrder.TypeStruct = {
                collection: artTokenAddr,
                currency: usdcAddr,
                maker: makerAddr,
                tokenId: TOKEN_ID,
                price: MIN_PRICE,
                makerFee: await market.bidFee(MIN_PRICE),
                startTime,
                endTime,
            };

            const permit: OrderExecutionPermit.TypeStruct = {
                participants: [institutionAddr, financierAddr],
                shares: [(TOTAL_SHARE / 5n) * 2n, TOTAL_SHARE / 10n],
                deadline: latestBlockTimestamp + HOUR,
            };

            const tx = MarketUtils.executeBid({
                market,
                order,
                permit,
                orderSigner: maker,
                permitSigner: marketSigner,
                sender: taker,
            });

            await expect(tx).to.eventually.rejectedWith('MarketOrderOutsideOfTimeRange');
        });

        it(`should fail if the order end time is smaller than the current time`, async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();

            const startTime = latestBlockTimestamp - HOUR * 3;
            const endTime = latestBlockTimestamp - HOUR;

            const order: BidOrder.TypeStruct = {
                collection: artTokenAddr,
                currency: usdcAddr,
                maker: makerAddr,
                tokenId: TOKEN_ID,
                price: MIN_PRICE,
                makerFee: await market.bidFee(MIN_PRICE),
                startTime,
                endTime,
            };

            const permit: OrderExecutionPermit.TypeStruct = {
                participants: [institutionAddr, financierAddr],
                shares: [(TOTAL_SHARE / 5n) * 2n, TOTAL_SHARE / 10n],
                deadline: latestBlockTimestamp + HOUR,
            };

            const tx = MarketUtils.executeBid({
                market,
                order,
                permit,
                orderSigner: maker,
                permitSigner: marketSigner,
                sender: taker,
            });

            await expect(tx).to.eventually.rejectedWith('MarketOrderOutsideOfTimeRange');
        });

        it(`should fail if the order signer is not the maker`, async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();

            const order: BidOrder.TypeStruct = {
                collection: artTokenAddr,
                currency: usdcAddr,
                maker: makerAddr,
                tokenId: TOKEN_ID,
                price: MIN_PRICE,
                makerFee: await market.bidFee(MIN_PRICE),
                startTime: latestBlockTimestamp,
                endTime: latestBlockTimestamp + HOUR,
            };

            const permit: OrderExecutionPermit.TypeStruct = {
                participants: [institutionAddr, financierAddr],
                shares: [(TOTAL_SHARE / 5n) * 2n, TOTAL_SHARE / 10n],
                deadline: latestBlockTimestamp + HOUR,
            };

            const tx = MarketUtils.executeBid({
                market,
                order,
                permit,
                orderSigner: randomAccount,
                permitSigner: marketSigner,
                sender: taker,
            });

            await expect(tx).to.eventually.rejectedWith('MarketUnauthorizedOrder');
        });

        it(`should fail if the permit order hash and the order hash do not match`, async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();

            const order: BidOrder.TypeStruct = {
                collection: artTokenAddr,
                currency: usdcAddr,
                maker: makerAddr,
                tokenId: TOKEN_ID,
                price: MIN_PRICE,
                makerFee: await market.bidFee(MIN_PRICE),
                startTime: latestBlockTimestamp,
                endTime: latestBlockTimestamp + HOUR,
            };

            const orderHash = MarketUtils.hashBidOrder({ ...order, tokenId: 0 });

            const permit: OrderExecutionPermit.TypeStruct = {
                participants: [institutionAddr, financierAddr],
                shares: [(TOTAL_SHARE / 5n) * 2n, TOTAL_SHARE / 10n],
                deadline: latestBlockTimestamp + HOUR,
            };

            const tx = MarketUtils.executeBid({
                market,
                order,
                permit: { ...permit, orderHash },
                orderSigner: maker,
                permitSigner: marketSigner,
                sender: taker,
            });

            await expect(tx).to.eventually.rejectedWith('AuthorizationUnauthorizedAction');
        });

        it(`should fail if the permit signer is not the market signer`, async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();

            const order: BidOrder.TypeStruct = {
                collection: artTokenAddr,
                currency: usdcAddr,
                maker: makerAddr,
                tokenId: TOKEN_ID,
                price: MIN_PRICE,
                makerFee: await market.bidFee(MIN_PRICE),
                startTime: latestBlockTimestamp,
                endTime: latestBlockTimestamp + HOUR,
            };

            const permit: OrderExecutionPermit.TypeStruct = {
                participants: [institutionAddr, financierAddr],
                shares: [(TOTAL_SHARE / 5n) * 2n, TOTAL_SHARE / 10n],
                deadline: latestBlockTimestamp + HOUR,
            };

            const tx = MarketUtils.executeBid({
                market,
                order,
                permit,
                orderSigner: maker,
                permitSigner: randomAccount,
                sender: taker,
            });

            await expect(tx).to.eventually.rejectedWith('AuthorizationUnauthorizedAction');
        });

        it(`should fail if the order is invalidated`, async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();

            const order: BidOrder.TypeStruct = {
                collection: artTokenAddr,
                currency: usdcAddr,
                maker: makerAddr,
                tokenId: TOKEN_ID,
                price: MIN_PRICE,
                makerFee: await market.bidFee(MIN_PRICE),
                startTime: latestBlockTimestamp,
                endTime: latestBlockTimestamp + HOUR,
            };

            const orderHash = MarketUtils.hashBidOrder(order);

            const permit: OrderExecutionPermit.TypeStruct = {
                participants: [institutionAddr, financierAddr],
                shares: [(TOTAL_SHARE / 5n) * 2n, TOTAL_SHARE / 10n],
                deadline: latestBlockTimestamp + HOUR,
            };

            await market.connect(maker).invalidateOrder(makerAddr, orderHash);

            const tx = MarketUtils.executeBid({
                market,
                order,
                permit,
                orderSigner: maker,
                permitSigner: marketSigner,
                sender: taker,
            });

            await expect(tx).to.eventually.rejectedWith('MarketOrderInvalidated');
        });

        it.skip(`should fail if the calculated fee is bigger than the maker fee`, async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();

            const price = MIN_PRICE;
            const makerFee = (await market.bidFee(price)) - 1n;

            const order: BidOrder.TypeStruct = {
                collection: artTokenAddr,
                currency: usdcAddr,
                maker: makerAddr,
                tokenId: TOKEN_ID,
                price,
                makerFee,
                startTime: latestBlockTimestamp,
                endTime: latestBlockTimestamp + HOUR,
            };

            const permit: OrderExecutionPermit.TypeStruct = {
                participants: [institutionAddr, financierAddr],
                shares: [(TOTAL_SHARE / 5n) * 2n, TOTAL_SHARE / 10n],
                deadline: latestBlockTimestamp + HOUR,
            };

            const tx = MarketUtils.executeBid({
                market,
                order,
                permit,
                orderSigner: maker,
                permitSigner: marketSigner,
                sender: taker,
            });

            await expect(tx).to.eventually.rejectedWith('MarketUserBidFeeTooLow');
        });
    });

    describe(`method 'bidFee'`, () => {
        it.skip(`should calculate fee correctly`, async () => {
            // price <= 100K USDC; fee = 5%
            const price1 = 100_000_000n;
            const fee1 = (price1 * 500n) / 10_000n;
            const price2 = 100_000_000_000n;
            const fee2 = (price2 * 500n) / 10_000n;
            // price <= 500K USDC; fee = 4%
            const price3 = price2 + 1n;
            const fee3 = (price3 * 400n) / 10_000n;
            const price4 = 500_000_000_000n;
            const fee4 = (price4 * 400n) / 10_000n;
            // price <= 5M USDC; fee = 3%
            const price5 = price4 + 1n;
            const fee5 = (price5 * 300n) / 10_000n;
            const price6 = 5_000_000_000_000n;
            const fee6 = (price6 * 300n) / 10_000n;
            // price > 5M USDC; fee = 2%
            const price7 = price6 + 1n;
            const fee7 = (price7 * 200n) / 10_000n;
            const price8 = price6 * 10n;
            const fee8 = (price8 * 200n) / 10_000n;

            await expect(market.bidFee(price1)).to.eventually.equal(fee1);
            await expect(market.bidFee(price2)).to.eventually.equal(fee2);
            await expect(market.bidFee(price3)).to.eventually.equal(fee3);
            await expect(market.bidFee(price4)).to.eventually.equal(fee4);
            await expect(market.bidFee(price5)).to.eventually.equal(fee5);
            await expect(market.bidFee(price6)).to.eventually.equal(fee6);
            await expect(market.bidFee(price7)).to.eventually.equal(fee7);
            await expect(market.bidFee(price8)).to.eventually.equal(fee8);
        });
    });

    describe(`method 'orderInvalidated'`, () => {
        it(`should return correct value`, async () => {
            const orderHash = randomBytes(32);

            await expect(market.orderInvalidated(maker, orderHash)).to.eventually.equal(false);

            await market.connect(maker).invalidateOrder(maker, orderHash);

            await expect(market.orderInvalidated(maker, orderHash)).to.eventually.equal(true);
        });
    });

    describe(`method 'invalidateOrder'`, () => {
        it(`should invalidate the order if a sender is the maker`, async () => {
            const orderHash = randomBytes(32);

            const tx = await market.connect(maker).invalidateOrder(maker, orderHash);

            const invalidated = await market.orderInvalidated(maker, orderHash);

            expect(invalidated).equal(true);

            await expect(tx).to.be.emit(market, 'OrderInvalidated').withArgs(makerAddr, orderHash);
        });

        it(`should invalidate the order if a sender is the market admin`, async () => {
            const orderHash = randomBytes(32);

            await market.connect(marketAdmin).invalidateOrder(maker, orderHash);

            const invalidated = await market.orderInvalidated(maker, orderHash);

            expect(invalidated).equal(true);
        });

        it(`should fail if a sender is not the maker or the market admin`, async () => {
            const orderHash = randomBytes(32);

            const tx = market.connect(randomAccount).invalidateOrder(maker, orderHash);

            await expect(tx).to.eventually.rejectedWith('MarketUnauthorizedAccount');
        });
    });
});
