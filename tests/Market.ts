import { expect } from 'chai';
import { Signer, MaxInt256, randomBytes } from 'ethers';
import { ArtToken, Market, USDC } from '../typechain-types';
import { Order, ExecutionPermit } from '../typechain-types/contracts/market/Market';
import { BuyPermitStruct } from '../types/art-token';
import { TOTAL_SHARE } from './constants/distribution';
import { TOKEN_ID, TOKEN_URI } from './constants/art-token';
import { MIN_FEE, MIN_PRICE } from './constants/min-price-and-fee';
import { PRICE, ASK_SIDE_FEE, BID_SIDE_FEE, ASK_SIDE, BID_SIDE } from './constants/market';
import { HOUR } from './constants/time';
import { getSigners } from './utils/get-signers';
import { getLatestBlockTimestamp } from './utils/get-latest-block-timestamp';
import { deployAll } from './utils/deploy-all';
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
        const all = await deployAll({
            signer: marketSigner,
            financier,
            admin: marketAdmin,
        });

        market = all.market;
        marketAddr = all.marketAddr;
        artToken = all.artToken;
        artTokenAddr = all.artTokenAddr;
        usdc = all.usdc;
        usdcAddr = all.usdcAddr;
    });

    describe(`method 'executeAsk'`, () => {
        /**
         * MAKER is ASK_SIDE
         * TAKER is BID_SIDE
         */
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

            const askSideReward = PRICE - ASK_SIDE_FEE;
            const institutionReward = PRICE - askSideReward - 100n;
            const platformReward = PRICE - askSideReward - institutionReward;

            const order: Order.TypeStruct = {
                side: ASK_SIDE,
                collection: artTokenAddr,
                currency: usdcAddr,
                maker: makerAddr,
                tokenId: TOKEN_ID,
                price: PRICE,
                makerFee: ASK_SIDE_FEE,
                startTime: latestBlockTimestamp,
                endTime: latestBlockTimestamp + HOUR,
            };

            const orderHash = MarketUtils.hashOrder(order);

            const permit: ExecutionPermit.TypeStruct = {
                orderHash,
                taker: takerAddr,
                takerFee: BID_SIDE_FEE,
                participants: [institutionAddr, financierAddr],
                rewards: [institutionReward, platformReward],
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
                .withArgs(takerAddr, marketAddr, PRICE + BID_SIDE_FEE);

            await expect(tx)
                .to.be.emit(usdc, 'Transfer') //
                .withArgs(marketAddr, financierAddr, BID_SIDE_FEE);

            await expect(tx)
                .to.be.emit(usdc, 'Transfer')
                .withArgs(marketAddr, makerAddr, askSideReward);

            await expect(tx)
                .to.be.emit(usdc, 'Transfer')
                .withArgs(marketAddr, institutionAddr, institutionReward);

            await expect(tx)
                .to.be.emit(usdc, 'Transfer')
                .withArgs(marketAddr, financierAddr, platformReward);

            await expect(tx)
                .to.be.emit(artToken, 'Transfer') //
                .withArgs(makerAddr, takerAddr, TOKEN_ID);

            await expect(tx)
                .to.be.emit(market, 'AskOrderExecuted')
                .withArgs(orderHash, artTokenAddr, usdcAddr, makerAddr, takerAddr, TOKEN_ID, PRICE);

            await expect(market.orderInvalidated(maker, orderHash)).to.eventually.equal(true);
        });

        it(`should execute the order with zero maker fee`, async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();

            const order: Order.TypeStruct = {
                side: ASK_SIDE,
                collection: artTokenAddr,
                currency: usdcAddr,
                maker: makerAddr,
                tokenId: TOKEN_ID,
                price: PRICE,
                makerFee: 0n, // Zero fee
                startTime: latestBlockTimestamp,
                endTime: latestBlockTimestamp + HOUR,
            };

            const orderHash = MarketUtils.hashOrder(order);

            const permit: ExecutionPermit.TypeStruct = {
                orderHash,
                taker: takerAddr,
                takerFee: BID_SIDE_FEE,
                participants: [],
                rewards: [],
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

            await expect(tx).to.be.emit(usdc, 'Transfer').withArgs(marketAddr, makerAddr, PRICE); // Full price to maker
        });

        it(`should execute the order with zero taker fee`, async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();

            const order: Order.TypeStruct = {
                side: ASK_SIDE,
                collection: artTokenAddr,
                currency: usdcAddr,
                maker: makerAddr,
                tokenId: TOKEN_ID,
                price: PRICE,
                makerFee: ASK_SIDE_FEE,
                startTime: latestBlockTimestamp,
                endTime: latestBlockTimestamp + HOUR,
            };

            const orderHash = MarketUtils.hashOrder(order);

            const permit: ExecutionPermit.TypeStruct = {
                orderHash,
                taker: takerAddr,
                takerFee: 0n, // Zero taker fee
                participants: [institutionAddr],
                rewards: [ASK_SIDE_FEE],
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

            await expect(tx).to.be.emit(usdc, 'Transfer').withArgs(takerAddr, marketAddr, PRICE); // Only price, no fee
        });

        it(`should fail if the order start time is greater than the current time`, async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();

            const startTime = latestBlockTimestamp + HOUR * 2;
            const endTime = latestBlockTimestamp + HOUR * 10;

            const order: Order.TypeStruct = {
                side: ASK_SIDE,
                collection: artTokenAddr,
                currency: usdcAddr,
                maker: makerAddr,
                tokenId: TOKEN_ID,
                price: PRICE,
                makerFee: ASK_SIDE_FEE,
                startTime,
                endTime,
            };

            const permit: ExecutionPermit.TypeStruct = {
                orderHash: MarketUtils.hashOrder(order),
                taker: takerAddr,
                takerFee: BID_SIDE_FEE,
                participants: [institutionAddr],
                rewards: [ASK_SIDE_FEE],
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

        it(`should fail if the order end time is less than the current time`, async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();

            const startTime = latestBlockTimestamp - HOUR * 3;
            const endTime = latestBlockTimestamp - HOUR;

            const order: Order.TypeStruct = {
                side: ASK_SIDE,
                collection: artTokenAddr,
                currency: usdcAddr,
                maker: makerAddr,
                tokenId: TOKEN_ID,
                price: PRICE,
                makerFee: ASK_SIDE_FEE,
                startTime,
                endTime,
            };

            const permit: ExecutionPermit.TypeStruct = {
                orderHash: MarketUtils.hashOrder(order),
                taker: takerAddr,
                takerFee: BID_SIDE_FEE,
                participants: [institutionAddr],
                rewards: [ASK_SIDE_FEE],
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

            const order: Order.TypeStruct = {
                side: ASK_SIDE,
                collection: artTokenAddr,
                currency: usdcAddr,
                maker: makerAddr,
                tokenId: TOKEN_ID,
                price: PRICE,
                makerFee: ASK_SIDE_FEE,
                startTime: latestBlockTimestamp,
                endTime: latestBlockTimestamp + HOUR,
            };

            const permit: ExecutionPermit.TypeStruct = {
                orderHash: MarketUtils.hashOrder(order),
                taker: takerAddr,
                takerFee: BID_SIDE_FEE,
                participants: [institutionAddr],
                rewards: [ASK_SIDE_FEE],
                deadline: latestBlockTimestamp + HOUR,
            };

            const tx = MarketUtils.executeAsk({
                market,
                order,
                permit,
                orderSigner: randomAccount, // Wrong order signer
                permitSigner: marketSigner,
                sender: taker,
            });

            await expect(tx).to.eventually.rejectedWith('MarketUnauthorizedOrder');
        });

        it(`should fail if the permit order hash and the order hash do not match`, async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();

            const order: Order.TypeStruct = {
                side: ASK_SIDE,
                collection: artTokenAddr,
                currency: usdcAddr,
                maker: makerAddr,
                tokenId: TOKEN_ID,
                price: PRICE,
                makerFee: ASK_SIDE_FEE,
                startTime: latestBlockTimestamp,
                endTime: latestBlockTimestamp + HOUR,
            };

            const permit: ExecutionPermit.TypeStruct = {
                orderHash: randomBytes(32), // Wrong order hash
                taker: takerAddr,
                takerFee: BID_SIDE_FEE,
                participants: [institutionAddr],
                rewards: [ASK_SIDE_FEE],
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

            await expect(tx).to.eventually.rejectedWith('MarketInvalidOrderHash');
        });

        it(`should fail if the permit signer is not the market signer`, async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();

            const order: Order.TypeStruct = {
                side: ASK_SIDE,
                collection: artTokenAddr,
                currency: usdcAddr,
                maker: makerAddr,
                tokenId: TOKEN_ID,
                price: PRICE,
                makerFee: ASK_SIDE_FEE,
                startTime: latestBlockTimestamp,
                endTime: latestBlockTimestamp + HOUR,
            };

            const permit: ExecutionPermit.TypeStruct = {
                orderHash: MarketUtils.hashOrder(order),
                taker: takerAddr,
                takerFee: BID_SIDE_FEE,
                participants: [institutionAddr],
                rewards: [ASK_SIDE_FEE],
                deadline: latestBlockTimestamp + HOUR,
            };

            const tx = MarketUtils.executeAsk({
                market,
                order,
                permit,
                orderSigner: maker,
                permitSigner: randomAccount, // Wrong permit signer
                sender: taker,
            });

            await expect(tx).to.eventually.rejectedWith('AuthorizationUnauthorizedAction');
        });

        it(`should fail if the order is invalidated`, async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();

            const order: Order.TypeStruct = {
                side: ASK_SIDE,
                collection: artTokenAddr,
                currency: usdcAddr,
                maker: makerAddr,
                tokenId: TOKEN_ID,
                price: PRICE,
                makerFee: ASK_SIDE_FEE,
                startTime: latestBlockTimestamp,
                endTime: latestBlockTimestamp + HOUR,
            };

            const orderHash = MarketUtils.hashOrder(order);

            const permit: ExecutionPermit.TypeStruct = {
                orderHash,
                taker: takerAddr,
                takerFee: BID_SIDE_FEE,
                participants: [institutionAddr],
                rewards: [ASK_SIDE_FEE],
                deadline: latestBlockTimestamp + HOUR,
            };

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

        it(`should fail if the order side is not ASK`, async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();

            const order: Order.TypeStruct = {
                side: BID_SIDE, // Wrong side
                collection: artTokenAddr,
                currency: usdcAddr,
                maker: makerAddr,
                tokenId: TOKEN_ID,
                price: PRICE,
                makerFee: ASK_SIDE_FEE,
                startTime: latestBlockTimestamp,
                endTime: latestBlockTimestamp + HOUR,
            };

            const permit: ExecutionPermit.TypeStruct = {
                orderHash: MarketUtils.hashOrder(order),
                taker: takerAddr,
                takerFee: BID_SIDE_FEE,
                participants: [institutionAddr],
                rewards: [ASK_SIDE_FEE],
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

            await expect(tx).to.eventually.rejectedWith('MarketInvalidOrderSide');
        });

        it(`should fail if the ask side fee is greater than or equal to the price`, async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();

            const order: Order.TypeStruct = {
                side: ASK_SIDE,
                collection: artTokenAddr,
                currency: usdcAddr,
                maker: makerAddr,
                tokenId: TOKEN_ID,
                price: PRICE,
                makerFee: PRICE, // Fee equals price
                startTime: latestBlockTimestamp,
                endTime: latestBlockTimestamp + HOUR,
            };

            const permit: ExecutionPermit.TypeStruct = {
                orderHash: MarketUtils.hashOrder(order),
                taker: takerAddr,
                takerFee: BID_SIDE_FEE,
                participants: [institutionAddr],
                rewards: [ASK_SIDE_FEE],
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

            await expect(tx).to.eventually.rejectedWith('MarketInvalidAskSideFee');
        });

        it(`should fail if the currency is not allowed`, async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();

            const order: Order.TypeStruct = {
                side: ASK_SIDE,
                collection: artTokenAddr,
                currency: randomAccountAddr, // Invalid currency
                maker: makerAddr,
                tokenId: TOKEN_ID,
                price: PRICE,
                makerFee: ASK_SIDE_FEE,
                startTime: latestBlockTimestamp,
                endTime: latestBlockTimestamp + HOUR,
            };

            const permit: ExecutionPermit.TypeStruct = {
                orderHash: MarketUtils.hashOrder(order),
                taker: takerAddr,
                takerFee: BID_SIDE_FEE,
                participants: [institutionAddr],
                rewards: [ASK_SIDE_FEE],
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

            await expect(tx).to.eventually.rejectedWith('MarketCurrencyInvalid');
        });

        it(`should fail if the permit taker is not the sender`, async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();

            const order: Order.TypeStruct = {
                side: ASK_SIDE,
                collection: artTokenAddr,
                currency: usdcAddr,
                maker: makerAddr,
                tokenId: TOKEN_ID,
                price: PRICE,
                makerFee: ASK_SIDE_FEE,
                startTime: latestBlockTimestamp,
                endTime: latestBlockTimestamp + HOUR,
            };

            const permit: ExecutionPermit.TypeStruct = {
                orderHash: MarketUtils.hashOrder(order),
                taker: randomAccountAddr, // Different taker
                takerFee: BID_SIDE_FEE,
                participants: [institutionAddr],
                rewards: [ASK_SIDE_FEE],
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

            await expect(tx).to.eventually.rejectedWith('MarketUnauthorizedAccount');
        });

        it(`should fail if the permit deadline has expired`, async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();

            const order: Order.TypeStruct = {
                side: ASK_SIDE,
                collection: artTokenAddr,
                currency: usdcAddr,
                maker: makerAddr,
                tokenId: TOKEN_ID,
                price: PRICE,
                makerFee: ASK_SIDE_FEE,
                startTime: latestBlockTimestamp,
                endTime: latestBlockTimestamp + HOUR,
            };

            const permit: ExecutionPermit.TypeStruct = {
                orderHash: MarketUtils.hashOrder(order),
                taker: takerAddr,
                takerFee: BID_SIDE_FEE,
                participants: [institutionAddr],
                rewards: [ASK_SIDE_FEE],
                deadline: latestBlockTimestamp - HOUR, // Expired deadline
            };

            const tx = MarketUtils.executeAsk({
                market,
                order,
                permit,
                orderSigner: maker,
                permitSigner: marketSigner,
                sender: taker,
            });

            await expect(tx).to.eventually.rejectedWith('AuthorizationDeadlineExpired');
        });
    });

    describe(`method 'executeBid'`, () => {
        /**
         * MAKER is BID_SIDE
         * TAKER is ASK_SIDE
         */
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

            const askSideReward = PRICE - ASK_SIDE_FEE;
            const institutionReward = PRICE - askSideReward - 100n;
            const platformReward = PRICE - askSideReward - institutionReward;

            const order: Order.TypeStruct = {
                side: BID_SIDE,
                collection: artTokenAddr,
                currency: usdcAddr,
                maker: makerAddr,
                tokenId: TOKEN_ID,
                price: PRICE,
                makerFee: BID_SIDE_FEE,
                startTime: latestBlockTimestamp,
                endTime: latestBlockTimestamp + HOUR,
            };

            const orderHash = MarketUtils.hashOrder(order);

            const permit: ExecutionPermit.TypeStruct = {
                orderHash,
                taker: takerAddr,
                takerFee: ASK_SIDE_FEE,
                participants: [institutionAddr, financierAddr],
                rewards: [institutionReward, platformReward],
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
                .withArgs(makerAddr, marketAddr, PRICE + BID_SIDE_FEE);

            await expect(tx)
                .to.be.emit(usdc, 'Transfer') //
                .withArgs(marketAddr, financierAddr, BID_SIDE_FEE);

            await expect(tx)
                .to.be.emit(usdc, 'Transfer')
                .withArgs(marketAddr, takerAddr, askSideReward);

            await expect(tx)
                .to.be.emit(usdc, 'Transfer')
                .withArgs(marketAddr, institutionAddr, institutionReward);

            await expect(tx)
                .to.be.emit(usdc, 'Transfer')
                .withArgs(marketAddr, financierAddr, platformReward);

            await expect(tx)
                .to.be.emit(artToken, 'Transfer') //
                .withArgs(takerAddr, makerAddr, TOKEN_ID);

            await expect(tx)
                .to.be.emit(market, 'BidOrderExecuted')
                .withArgs(orderHash, artTokenAddr, usdcAddr, makerAddr, takerAddr, TOKEN_ID, PRICE);

            await expect(market.orderInvalidated(maker, orderHash)).to.eventually.equal(true);
        });

        it(`should execute the order with zero maker fee`, async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();

            const order: Order.TypeStruct = {
                side: BID_SIDE,
                collection: artTokenAddr,
                currency: usdcAddr,
                maker: makerAddr,
                tokenId: TOKEN_ID,
                price: PRICE,
                makerFee: 0n, // Zero fee
                startTime: latestBlockTimestamp,
                endTime: latestBlockTimestamp + HOUR,
            };

            const orderHash = MarketUtils.hashOrder(order);

            const permit: ExecutionPermit.TypeStruct = {
                orderHash,
                taker: takerAddr,
                takerFee: ASK_SIDE_FEE,
                participants: [institutionAddr],
                rewards: [ASK_SIDE_FEE],
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

            await expect(tx).to.be.emit(usdc, 'Transfer').withArgs(makerAddr, marketAddr, PRICE); // Only price, no fee from maker
        });

        it(`should execute the order with zero taker fee`, async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();

            const order: Order.TypeStruct = {
                side: BID_SIDE,
                collection: artTokenAddr,
                currency: usdcAddr,
                maker: makerAddr,
                tokenId: TOKEN_ID,
                price: PRICE,
                makerFee: BID_SIDE_FEE,
                startTime: latestBlockTimestamp,
                endTime: latestBlockTimestamp + HOUR,
            };

            const orderHash = MarketUtils.hashOrder(order);

            const permit: ExecutionPermit.TypeStruct = {
                orderHash,
                taker: takerAddr,
                takerFee: 0n, // Zero taker fee
                participants: [],
                rewards: [],
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

            await expect(tx).to.be.emit(usdc, 'Transfer').withArgs(marketAddr, takerAddr, PRICE); // Full price to taker
        });

        it(`should fail if the order start time is greater than the current time`, async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();

            const startTime = latestBlockTimestamp + HOUR * 2;
            const endTime = latestBlockTimestamp + HOUR * 10;

            const order: Order.TypeStruct = {
                side: BID_SIDE,
                collection: artTokenAddr,
                currency: usdcAddr,
                maker: makerAddr,
                tokenId: TOKEN_ID,
                price: PRICE,
                makerFee: BID_SIDE_FEE,
                startTime,
                endTime,
            };

            const permit: ExecutionPermit.TypeStruct = {
                orderHash: MarketUtils.hashOrder(order),
                taker: takerAddr,
                takerFee: ASK_SIDE_FEE,
                participants: [institutionAddr],
                rewards: [ASK_SIDE_FEE],
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

        it(`should fail if the order end time is less than the current time`, async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();

            const startTime = latestBlockTimestamp - HOUR * 3;
            const endTime = latestBlockTimestamp - HOUR;

            const order: Order.TypeStruct = {
                side: BID_SIDE,
                collection: artTokenAddr,
                currency: usdcAddr,
                maker: makerAddr,
                tokenId: TOKEN_ID,
                price: PRICE,
                makerFee: BID_SIDE_FEE,
                startTime,
                endTime,
            };

            const permit: ExecutionPermit.TypeStruct = {
                orderHash: MarketUtils.hashOrder(order),
                taker: takerAddr,
                takerFee: ASK_SIDE_FEE,
                participants: [institutionAddr],
                rewards: [ASK_SIDE_FEE],
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

            const order: Order.TypeStruct = {
                side: BID_SIDE,
                collection: artTokenAddr,
                currency: usdcAddr,
                maker: makerAddr,
                tokenId: TOKEN_ID,
                price: PRICE,
                makerFee: BID_SIDE_FEE,
                startTime: latestBlockTimestamp,
                endTime: latestBlockTimestamp + HOUR,
            };

            const permit: ExecutionPermit.TypeStruct = {
                orderHash: MarketUtils.hashOrder(order),
                taker: takerAddr,
                takerFee: ASK_SIDE_FEE,
                participants: [institutionAddr],
                rewards: [ASK_SIDE_FEE],
                deadline: latestBlockTimestamp + HOUR,
            };

            const tx = MarketUtils.executeBid({
                market,
                order,
                permit,
                orderSigner: randomAccount, // Wrong order signer
                permitSigner: marketSigner,
                sender: taker,
            });

            await expect(tx).to.eventually.rejectedWith('MarketUnauthorizedOrder');
        });

        it(`should fail if the permit order hash and the order hash do not match`, async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();

            const order: Order.TypeStruct = {
                side: BID_SIDE,
                collection: artTokenAddr,
                currency: usdcAddr,
                maker: makerAddr,
                tokenId: TOKEN_ID,
                price: PRICE,
                makerFee: BID_SIDE_FEE,
                startTime: latestBlockTimestamp,
                endTime: latestBlockTimestamp + HOUR,
            };

            const permit: ExecutionPermit.TypeStruct = {
                orderHash: randomBytes(32), // Wrong order hash
                taker: takerAddr,
                takerFee: ASK_SIDE_FEE,
                participants: [institutionAddr],
                rewards: [ASK_SIDE_FEE],
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

            await expect(tx).to.eventually.rejectedWith('MarketInvalidOrderHash');
        });

        it(`should fail if the permit signer is not the market signer`, async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();

            const order: Order.TypeStruct = {
                side: BID_SIDE,
                collection: artTokenAddr,
                currency: usdcAddr,
                maker: makerAddr,
                tokenId: TOKEN_ID,
                price: PRICE,
                makerFee: BID_SIDE_FEE,
                startTime: latestBlockTimestamp,
                endTime: latestBlockTimestamp + HOUR,
            };

            const permit: ExecutionPermit.TypeStruct = {
                orderHash: MarketUtils.hashOrder(order),
                taker: takerAddr,
                takerFee: ASK_SIDE_FEE,
                participants: [institutionAddr],
                rewards: [ASK_SIDE_FEE],
                deadline: latestBlockTimestamp + HOUR,
            };

            const tx = MarketUtils.executeBid({
                market,
                order,
                permit,
                orderSigner: maker,
                permitSigner: randomAccount, // Wrong permit signer
                sender: taker,
            });

            await expect(tx).to.eventually.rejectedWith('AuthorizationUnauthorizedAction');
        });

        it(`should fail if the order is invalidated`, async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();

            const order: Order.TypeStruct = {
                side: BID_SIDE,
                collection: artTokenAddr,
                currency: usdcAddr,
                maker: makerAddr,
                tokenId: TOKEN_ID,
                price: PRICE,
                makerFee: BID_SIDE_FEE,
                startTime: latestBlockTimestamp,
                endTime: latestBlockTimestamp + HOUR,
            };

            const orderHash = MarketUtils.hashOrder(order);

            const permit: ExecutionPermit.TypeStruct = {
                orderHash,
                taker: takerAddr,
                takerFee: ASK_SIDE_FEE,
                participants: [institutionAddr],
                rewards: [ASK_SIDE_FEE],
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

        it(`should fail if the order side is not BID`, async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();

            const order: Order.TypeStruct = {
                side: ASK_SIDE, // Wrong side
                collection: artTokenAddr,
                currency: usdcAddr,
                maker: makerAddr,
                tokenId: TOKEN_ID,
                price: PRICE,
                makerFee: BID_SIDE_FEE,
                startTime: latestBlockTimestamp,
                endTime: latestBlockTimestamp + HOUR,
            };

            const permit: ExecutionPermit.TypeStruct = {
                orderHash: MarketUtils.hashOrder(order),
                taker: takerAddr,
                takerFee: ASK_SIDE_FEE,
                participants: [institutionAddr],
                rewards: [ASK_SIDE_FEE],
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

            await expect(tx).to.eventually.rejectedWith('MarketInvalidOrderSide');
        });

        it(`should fail if the ask side fee is greater than or equal to the price`, async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();

            const order: Order.TypeStruct = {
                side: BID_SIDE,
                collection: artTokenAddr,
                currency: usdcAddr,
                maker: makerAddr,
                tokenId: TOKEN_ID,
                price: PRICE,
                makerFee: BID_SIDE_FEE,
                startTime: latestBlockTimestamp,
                endTime: latestBlockTimestamp + HOUR,
            };

            const permit: ExecutionPermit.TypeStruct = {
                orderHash: MarketUtils.hashOrder(order),
                taker: takerAddr,
                takerFee: PRICE, // Fee equals price
                participants: [institutionAddr],
                rewards: [ASK_SIDE_FEE],
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

            await expect(tx).to.eventually.rejectedWith('MarketInvalidAskSideFee');
        });

        it(`should fail if the currency is not allowed`, async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();

            const order: Order.TypeStruct = {
                side: BID_SIDE,
                collection: artTokenAddr,
                currency: randomAccountAddr, // Invalid currency
                maker: makerAddr,
                tokenId: TOKEN_ID,
                price: PRICE,
                makerFee: BID_SIDE_FEE,
                startTime: latestBlockTimestamp,
                endTime: latestBlockTimestamp + HOUR,
            };

            const permit: ExecutionPermit.TypeStruct = {
                orderHash: MarketUtils.hashOrder(order),
                taker: takerAddr,
                takerFee: ASK_SIDE_FEE,
                participants: [institutionAddr],
                rewards: [ASK_SIDE_FEE],
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

            await expect(tx).to.eventually.rejectedWith('MarketCurrencyInvalid');
        });

        it(`should fail if the permit taker is not the sender`, async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();

            const order: Order.TypeStruct = {
                side: BID_SIDE,
                collection: artTokenAddr,
                currency: usdcAddr,
                maker: makerAddr,
                tokenId: TOKEN_ID,
                price: PRICE,
                makerFee: BID_SIDE_FEE,
                startTime: latestBlockTimestamp,
                endTime: latestBlockTimestamp + HOUR,
            };

            const permit: ExecutionPermit.TypeStruct = {
                orderHash: MarketUtils.hashOrder(order),
                taker: randomAccountAddr, // Different taker
                takerFee: ASK_SIDE_FEE,
                participants: [institutionAddr],
                rewards: [ASK_SIDE_FEE],
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

            await expect(tx).to.eventually.rejectedWith('MarketUnauthorizedAccount');
        });

        it(`should fail if the permit deadline has expired`, async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();

            const order: Order.TypeStruct = {
                side: BID_SIDE,
                collection: artTokenAddr,
                currency: usdcAddr,
                maker: makerAddr,
                tokenId: TOKEN_ID,
                price: PRICE,
                makerFee: BID_SIDE_FEE,
                startTime: latestBlockTimestamp,
                endTime: latestBlockTimestamp + HOUR,
            };

            const permit: ExecutionPermit.TypeStruct = {
                orderHash: MarketUtils.hashOrder(order),
                taker: takerAddr,
                takerFee: ASK_SIDE_FEE,
                participants: [institutionAddr],
                rewards: [ASK_SIDE_FEE],
                deadline: latestBlockTimestamp - HOUR, // Expired deadline
            };

            const tx = MarketUtils.executeBid({
                market,
                order,
                permit,
                orderSigner: maker,
                permitSigner: marketSigner,
                sender: taker,
            });

            await expect(tx).to.eventually.rejectedWith('AuthorizationDeadlineExpired');
        });
    });

    describe(`method 'orderInvalidated'`, () => {
        it(`should return the correct value`, async () => {
            const orderHash = randomBytes(32);

            await expect(market.orderInvalidated(maker, orderHash)).to.eventually.equal(false);

            await market.connect(maker).invalidateOrder(maker, orderHash);

            await expect(market.orderInvalidated(maker, orderHash)).to.eventually.equal(true);
        });
    });

    describe(`method 'invalidateOrder'`, () => {
        it(`should invalidate the order if the sender is the maker`, async () => {
            const orderHash = randomBytes(32);

            const tx = await market.connect(maker).invalidateOrder(maker, orderHash);

            const invalidated = await market.orderInvalidated(maker, orderHash);

            expect(invalidated).equal(true);

            await expect(tx).to.be.emit(market, 'OrderInvalidated').withArgs(makerAddr, orderHash);
        });

        it(`should invalidate the order if the sender is the market admin`, async () => {
            const orderHash = randomBytes(32);

            const tx = await market.connect(marketAdmin).invalidateOrder(maker, orderHash);

            const invalidated = await market.orderInvalidated(maker, orderHash);

            expect(invalidated).equal(true);

            await expect(tx).to.be.emit(market, 'OrderInvalidated').withArgs(makerAddr, orderHash);
        });

        it(`should fail when trying to invalidate an already invalidated order`, async () => {
            const orderHash = randomBytes(32);

            // First invalidation
            await market.connect(maker).invalidateOrder(maker, orderHash);

            // Second invalidation attempt
            const tx = market.connect(maker).invalidateOrder(maker, orderHash);

            await expect(tx).to.eventually.rejectedWith('MarketOrderInvalidated');
        });

        it(`should fail if the sender is not the maker or the market admin`, async () => {
            const orderHash = randomBytes(32);

            const tx = market.connect(randomAccount).invalidateOrder(maker, orderHash);

            await expect(tx).to.eventually.rejectedWith('MarketUnauthorizedAccount');
        });
    });
});
