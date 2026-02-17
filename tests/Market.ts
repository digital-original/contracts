import { expect } from 'chai';
import { Signer, MaxInt256, randomBytes } from 'ethers';
import { ArtToken, Market, USDC } from '../typechain-types';
import { TokenMintingPermit } from '../typechain-types/contracts/art-token/ArtToken';
import { Order, OrderExecutionPermit } from '../typechain-types/contracts/market/Market';
import { TOKEN_CONFIG, TOKEN_FEE, TOKEN_ID, TOKEN_PRICE, TOKEN_URI } from './constants/art-token';
import { ETHER_ADDR, HOUR } from './constants/general';
import { ORDER_PRICE, ASK_SIDE_FEE, BID_SIDE_FEE, ASK_SIDE, BID_SIDE } from './constants/market';
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

            const tokenMintingPermit: TokenMintingPermit.TypeStruct = {
                tokenId: TOKEN_ID,
                minter: makerAddr,
                currency: usdcAddr,
                price: TOKEN_PRICE,
                fee: TOKEN_FEE,
                tokenURI: TOKEN_URI,
                tokenConfig: TOKEN_CONFIG,
                participants: [institutionAddr],
                rewards: [TOKEN_PRICE],
                deadline: latestBlockTimestamp + HOUR,
            };

            await usdc.connect(maker).mintAndApprove(artToken, MaxInt256);

            await ArtTokenUtils.mint({
                artToken,
                permit: tokenMintingPermit,
                permitSigner: marketSigner,
                sender: maker,
            });

            await artToken.connect(maker).approve(marketAddr, TOKEN_ID);

            await usdc.connect(taker).mintAndApprove(marketAddr, MaxInt256);
        });

        it(`should execute the order`, async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();

            const askSideReward = ORDER_PRICE - ASK_SIDE_FEE;
            const platformReward = 100n;
            const institutionReward = ASK_SIDE_FEE - platformReward;

            const order: Order.TypeStruct = {
                side: ASK_SIDE,
                collection: artTokenAddr,
                currency: usdcAddr,
                maker: makerAddr,
                tokenId: TOKEN_ID,
                price: ORDER_PRICE,
                makerFee: ASK_SIDE_FEE,
                startTime: latestBlockTimestamp,
                endTime: latestBlockTimestamp + HOUR,
            };

            const orderHash = MarketUtils.hashOrder(order);

            const orderExecutionPermit: OrderExecutionPermit.TypeStruct = {
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
                permit: orderExecutionPermit,
                orderSigner: maker,
                permitSigner: marketSigner,
                sender: taker,
            });

            const orderInvalidated = await market.orderInvalidated(maker, orderHash);

            expect(orderInvalidated).equal(true);

            await expect(tx) //
                .emit(usdc, 'Transfer')
                .withArgs(takerAddr, marketAddr, ORDER_PRICE + BID_SIDE_FEE);

            await expect(tx) //
                .emit(usdc, 'Transfer')
                .withArgs(marketAddr, financierAddr, BID_SIDE_FEE);

            await expect(tx) //
                .emit(usdc, 'Transfer')
                .withArgs(marketAddr, makerAddr, askSideReward);

            await expect(tx) //
                .emit(usdc, 'Transfer')
                .withArgs(marketAddr, institutionAddr, institutionReward);

            await expect(tx) //
                .emit(usdc, 'Transfer')
                .withArgs(marketAddr, financierAddr, platformReward);

            await expect(tx) //
                .emit(artToken, 'Transfer')
                .withArgs(makerAddr, takerAddr, TOKEN_ID);

            await expect(tx) //
                .emit(market, 'AskOrderExecuted')
                .withArgs(
                    orderHash,
                    artTokenAddr,
                    usdcAddr,
                    makerAddr,
                    takerAddr,
                    TOKEN_ID,
                    ORDER_PRICE,
                );
        });

        it(`should execute the order with zero maker fee`, async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();

            const order: Order.TypeStruct = {
                side: ASK_SIDE,
                collection: artTokenAddr,
                currency: usdcAddr,
                maker: makerAddr,
                tokenId: TOKEN_ID,
                price: ORDER_PRICE,
                makerFee: 0n, // Zero fee
                startTime: latestBlockTimestamp,
                endTime: latestBlockTimestamp + HOUR,
            };

            const orderHash = MarketUtils.hashOrder(order);

            const orderExecutionPermit: OrderExecutionPermit.TypeStruct = {
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
                permit: orderExecutionPermit,
                orderSigner: maker,
                permitSigner: marketSigner,
                sender: taker,
            });

            await expect(tx) //
                .emit(usdc, 'Transfer')
                .withArgs(marketAddr, makerAddr, ORDER_PRICE); // Full price to maker
        });

        it(`should execute the order with zero taker fee`, async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();

            const order: Order.TypeStruct = {
                side: ASK_SIDE,
                collection: artTokenAddr,
                currency: usdcAddr,
                maker: makerAddr,
                tokenId: TOKEN_ID,
                price: ORDER_PRICE,
                makerFee: ASK_SIDE_FEE,
                startTime: latestBlockTimestamp,
                endTime: latestBlockTimestamp + HOUR,
            };

            const orderHash = MarketUtils.hashOrder(order);

            const orderExecutionPermit: OrderExecutionPermit.TypeStruct = {
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
                permit: orderExecutionPermit,
                orderSigner: maker,
                permitSigner: marketSigner,
                sender: taker,
            });

            await expect(tx) //
                .emit(usdc, 'Transfer')
                .withArgs(takerAddr, marketAddr, ORDER_PRICE); // Only price, no fee
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
                price: ORDER_PRICE,
                makerFee: ASK_SIDE_FEE,
                startTime,
                endTime,
            };

            const orderExecutionPermit: OrderExecutionPermit.TypeStruct = {
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
                permit: orderExecutionPermit,
                orderSigner: maker,
                permitSigner: marketSigner,
                sender: taker,
            });

            await expect(tx).rejectedWith('MarketOrderOutsideOfTimeRange');
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
                price: ORDER_PRICE,
                makerFee: ASK_SIDE_FEE,
                startTime,
                endTime,
            };

            const orderExecutionPermit: OrderExecutionPermit.TypeStruct = {
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
                permit: orderExecutionPermit,
                orderSigner: maker,
                permitSigner: marketSigner,
                sender: taker,
            });

            await expect(tx).rejectedWith('MarketOrderOutsideOfTimeRange');
        });

        it(`should fail if the order signer is not the maker`, async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();

            const order: Order.TypeStruct = {
                side: ASK_SIDE,
                collection: artTokenAddr,
                currency: usdcAddr,
                maker: makerAddr,
                tokenId: TOKEN_ID,
                price: ORDER_PRICE,
                makerFee: ASK_SIDE_FEE,
                startTime: latestBlockTimestamp,
                endTime: latestBlockTimestamp + HOUR,
            };

            const orderExecutionPermit: OrderExecutionPermit.TypeStruct = {
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
                permit: orderExecutionPermit,
                orderSigner: randomAccount, // Wrong order signer
                permitSigner: marketSigner,
                sender: taker,
            });

            await expect(tx).rejectedWith('MarketUnauthorizedOrder');
        });

        it(`should fail if the permit order hash and the order hash do not match`, async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();

            const order: Order.TypeStruct = {
                side: ASK_SIDE,
                collection: artTokenAddr,
                currency: usdcAddr,
                maker: makerAddr,
                tokenId: TOKEN_ID,
                price: ORDER_PRICE,
                makerFee: ASK_SIDE_FEE,
                startTime: latestBlockTimestamp,
                endTime: latestBlockTimestamp + HOUR,
            };

            const orderExecutionPermit: OrderExecutionPermit.TypeStruct = {
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
                permit: orderExecutionPermit,
                orderSigner: maker,
                permitSigner: marketSigner,
                sender: taker,
            });

            await expect(tx).rejectedWith('MarketInvalidOrderHash');
        });

        it(`should fail if the permit signer is not the market signer`, async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();

            const order: Order.TypeStruct = {
                side: ASK_SIDE,
                collection: artTokenAddr,
                currency: usdcAddr,
                maker: makerAddr,
                tokenId: TOKEN_ID,
                price: ORDER_PRICE,
                makerFee: ASK_SIDE_FEE,
                startTime: latestBlockTimestamp,
                endTime: latestBlockTimestamp + HOUR,
            };

            const orderExecutionPermit: OrderExecutionPermit.TypeStruct = {
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
                permit: orderExecutionPermit,
                orderSigner: maker,
                permitSigner: randomAccount, // Wrong permit signer
                sender: taker,
            });

            await expect(tx).rejectedWith('AuthorizationUnauthorizedAction');
        });

        it(`should fail if the order is invalidated`, async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();

            const order: Order.TypeStruct = {
                side: ASK_SIDE,
                collection: artTokenAddr,
                currency: usdcAddr,
                maker: makerAddr,
                tokenId: TOKEN_ID,
                price: ORDER_PRICE,
                makerFee: ASK_SIDE_FEE,
                startTime: latestBlockTimestamp,
                endTime: latestBlockTimestamp + HOUR,
            };

            const orderHash = MarketUtils.hashOrder(order);

            const orderExecutionPermit: OrderExecutionPermit.TypeStruct = {
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
                permit: orderExecutionPermit,
                orderSigner: maker,
                permitSigner: marketSigner,
                sender: taker,
            });

            await expect(tx).rejectedWith('MarketOrderInvalidated');
        });

        it(`should fail if the order side is not Ask`, async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();

            const order: Order.TypeStruct = {
                side: BID_SIDE, // Wrong side
                collection: artTokenAddr,
                currency: usdcAddr,
                maker: makerAddr,
                tokenId: TOKEN_ID,
                price: ORDER_PRICE,
                makerFee: ASK_SIDE_FEE,
                startTime: latestBlockTimestamp,
                endTime: latestBlockTimestamp + HOUR,
            };

            const orderExecutionPermit: OrderExecutionPermit.TypeStruct = {
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
                permit: orderExecutionPermit,
                orderSigner: maker,
                permitSigner: marketSigner,
                sender: taker,
            });

            await expect(tx).rejectedWith('MarketInvalidOrderSide');
        });

        it(`should fail if the ask side fee is greater than or equal to the price`, async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();

            const order: Order.TypeStruct = {
                side: ASK_SIDE,
                collection: artTokenAddr,
                currency: usdcAddr,
                maker: makerAddr,
                tokenId: TOKEN_ID,
                price: ORDER_PRICE,
                makerFee: ORDER_PRICE, // Fee equals price
                startTime: latestBlockTimestamp,
                endTime: latestBlockTimestamp + HOUR,
            };

            const orderExecutionPermit: OrderExecutionPermit.TypeStruct = {
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
                permit: orderExecutionPermit,
                orderSigner: maker,
                permitSigner: marketSigner,
                sender: taker,
            });

            await expect(tx).rejectedWith('MarketInvalidAskSideFee');
        });

        it(`should fail if the currency is not allowed`, async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();

            const order: Order.TypeStruct = {
                side: ASK_SIDE,
                collection: artTokenAddr,
                currency: randomAccountAddr, // Invalid currency
                maker: makerAddr,
                tokenId: TOKEN_ID,
                price: ORDER_PRICE,
                makerFee: ASK_SIDE_FEE,
                startTime: latestBlockTimestamp,
                endTime: latestBlockTimestamp + HOUR,
            };

            const orderExecutionPermit: OrderExecutionPermit.TypeStruct = {
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
                permit: orderExecutionPermit,
                orderSigner: maker,
                permitSigner: marketSigner,
                sender: taker,
            });

            await expect(tx).rejectedWith('MarketCurrencyInvalid');
        });

        it(`should fail if the sender is not the permitted taker`, async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();

            const order: Order.TypeStruct = {
                side: ASK_SIDE,
                collection: artTokenAddr,
                currency: usdcAddr,
                maker: makerAddr,
                tokenId: TOKEN_ID,
                price: ORDER_PRICE,
                makerFee: ASK_SIDE_FEE,
                startTime: latestBlockTimestamp,
                endTime: latestBlockTimestamp + HOUR,
            };

            const orderExecutionPermit: OrderExecutionPermit.TypeStruct = {
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
                permit: orderExecutionPermit,
                orderSigner: maker,
                permitSigner: marketSigner,
                sender: taker,
            });

            await expect(tx).rejectedWith('MarketUnauthorizedAccount');
        });

        it(`should fail if the permit deadline has expired`, async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();

            const order: Order.TypeStruct = {
                side: ASK_SIDE,
                collection: artTokenAddr,
                currency: usdcAddr,
                maker: makerAddr,
                tokenId: TOKEN_ID,
                price: ORDER_PRICE,
                makerFee: ASK_SIDE_FEE,
                startTime: latestBlockTimestamp,
                endTime: latestBlockTimestamp + HOUR,
            };

            const orderExecutionPermit: OrderExecutionPermit.TypeStruct = {
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
                permit: orderExecutionPermit,
                orderSigner: maker,
                permitSigner: marketSigner,
                sender: taker,
            });

            await expect(tx).rejectedWith('AuthorizationDeadlineExpired');
        });

        it(`should fail if the sum of rewards is greater than the ask side fee`, async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();

            const order: Order.TypeStruct = {
                side: ASK_SIDE,
                collection: artTokenAddr,
                currency: usdcAddr,
                maker: makerAddr,
                tokenId: TOKEN_ID,
                price: ORDER_PRICE,
                makerFee: ASK_SIDE_FEE,
                startTime: latestBlockTimestamp,
                endTime: latestBlockTimestamp + HOUR,
            };

            const orderExecutionPermit: OrderExecutionPermit.TypeStruct = {
                orderHash: MarketUtils.hashOrder(order),
                taker: takerAddr,
                takerFee: BID_SIDE_FEE,
                participants: [institutionAddr],
                rewards: [ASK_SIDE_FEE + 1n], // Incorrect rewards sum
                deadline: latestBlockTimestamp + HOUR,
            };

            await usdc.connect(taker).transfer(marketAddr, 1n);

            const tx = MarketUtils.executeAsk({
                market,
                order,
                permit: orderExecutionPermit,
                orderSigner: maker,
                permitSigner: marketSigner,
                sender: taker,
            });

            await expect(tx).rejectedWith('CurrencyTransfersIncorrectTotalAmount');
        });

        it(`should fail if the sum of rewards is less than the ask side fee`, async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();

            const order: Order.TypeStruct = {
                side: ASK_SIDE,
                collection: artTokenAddr,
                currency: usdcAddr,
                maker: makerAddr,
                tokenId: TOKEN_ID,
                price: ORDER_PRICE,
                makerFee: ASK_SIDE_FEE,
                startTime: latestBlockTimestamp,
                endTime: latestBlockTimestamp + HOUR,
            };

            const orderExecutionPermit: OrderExecutionPermit.TypeStruct = {
                orderHash: MarketUtils.hashOrder(order),
                taker: takerAddr,
                takerFee: BID_SIDE_FEE,
                participants: [institutionAddr],
                rewards: [ASK_SIDE_FEE - 1n], // Incorrect rewards sum
                deadline: latestBlockTimestamp + HOUR,
            };

            const tx = MarketUtils.executeAsk({
                market,
                order,
                permit: orderExecutionPermit,
                orderSigner: maker,
                permitSigner: marketSigner,
                sender: taker,
            });

            await expect(tx).rejectedWith('CurrencyTransfersIncorrectTotalAmount');
        });

        it(`should fail if unexpected ether is sent`, async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();

            const order: Order.TypeStruct = {
                side: ASK_SIDE,
                collection: artTokenAddr,
                currency: usdcAddr,
                maker: makerAddr,
                tokenId: TOKEN_ID,
                price: ORDER_PRICE,
                makerFee: ASK_SIDE_FEE,
                startTime: latestBlockTimestamp,
                endTime: latestBlockTimestamp + HOUR,
            };

            const orderHash = MarketUtils.hashOrder(order);

            const orderExecutionPermit: OrderExecutionPermit.TypeStruct = {
                orderHash,
                taker: takerAddr,
                takerFee: BID_SIDE_FEE,
                participants: [institutionAddr],
                rewards: [ASK_SIDE_FEE],
                deadline: latestBlockTimestamp + HOUR,
            };

            const tx = MarketUtils.executeAsk({
                market,
                order,
                permit: orderExecutionPermit,
                orderSigner: maker,
                permitSigner: marketSigner,
                sender: taker,
                value: 1n, // Unexpected ether
            });

            await expect(tx).rejectedWith('CurrencyTransfersUnexpectedEther');
        });
    });

    describe(`method 'executeAsk' with Ether`, () => {
        beforeEach(async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();

            const tokenMintingPermit: TokenMintingPermit.TypeStruct = {
                tokenId: TOKEN_ID,
                minter: makerAddr,
                currency: usdcAddr,
                price: TOKEN_PRICE,
                fee: TOKEN_FEE,
                tokenURI: TOKEN_URI,
                tokenConfig: TOKEN_CONFIG,
                participants: [institutionAddr],
                rewards: [TOKEN_PRICE],
                deadline: latestBlockTimestamp + HOUR,
            };

            await usdc.connect(maker).mintAndApprove(artToken, MaxInt256);

            await ArtTokenUtils.mint({
                artToken,
                permit: tokenMintingPermit,
                permitSigner: marketSigner,
                sender: maker,
            });

            await artToken.connect(maker).approve(marketAddr, TOKEN_ID);
        });

        it(`should transfer ether correctly`, async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();

            const askSideReward = ORDER_PRICE - ASK_SIDE_FEE;
            const platformReward = 100n;
            const institutionReward = ASK_SIDE_FEE - platformReward;

            const order: Order.TypeStruct = {
                side: ASK_SIDE,
                collection: artTokenAddr,
                currency: ETHER_ADDR,
                maker: makerAddr,
                tokenId: TOKEN_ID,
                price: ORDER_PRICE,
                makerFee: ASK_SIDE_FEE,
                startTime: latestBlockTimestamp,
                endTime: latestBlockTimestamp + HOUR,
            };

            const orderHash = MarketUtils.hashOrder(order);

            const orderExecutionPermit: OrderExecutionPermit.TypeStruct = {
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
                permit: orderExecutionPermit,
                orderSigner: maker,
                permitSigner: marketSigner,
                sender: taker,
                value: ORDER_PRICE + BID_SIDE_FEE,
            });

            await expect(tx).changeEtherBalance(marketAddr, 0n);

            await expect(tx).changeEtherBalance(takerAddr, (ORDER_PRICE + BID_SIDE_FEE) * -1n);

            await expect(tx).changeEtherBalance(makerAddr, askSideReward);

            await expect(tx).changeEtherBalance(institutionAddr, institutionReward);

            await expect(tx).changeEtherBalance(financierAddr, BID_SIDE_FEE + platformReward);
        });

        it(`should fail if incorrect amount of ether is sent`, async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();

            const order: Order.TypeStruct = {
                side: ASK_SIDE,
                collection: artTokenAddr,
                currency: ETHER_ADDR,
                maker: makerAddr,
                tokenId: TOKEN_ID,
                price: ORDER_PRICE,
                makerFee: ASK_SIDE_FEE,
                startTime: latestBlockTimestamp,
                endTime: latestBlockTimestamp + HOUR,
            };

            const orderHash = MarketUtils.hashOrder(order);

            const orderExecutionPermit: OrderExecutionPermit.TypeStruct = {
                orderHash,
                taker: takerAddr,
                takerFee: BID_SIDE_FEE,
                participants: [institutionAddr],
                rewards: [ASK_SIDE_FEE],
                deadline: latestBlockTimestamp + HOUR,
            };

            const tx1 = MarketUtils.executeAsk({
                market,
                order,
                permit: orderExecutionPermit,
                orderSigner: maker,
                permitSigner: marketSigner,
                sender: taker,
                value: ORDER_PRICE + BID_SIDE_FEE + 1n, // Too much ether
            });

            const tx2 = MarketUtils.executeAsk({
                market,
                order,
                permit: orderExecutionPermit,
                orderSigner: maker,
                permitSigner: marketSigner,
                sender: taker,
                value: ORDER_PRICE + BID_SIDE_FEE - 1n, // Too little ether
            });

            await expect(tx1).rejectedWith('CurrencyTransfersIncorrectEtherValue');

            await expect(tx2).rejectedWith('CurrencyTransfersIncorrectEtherValue');
        });
    });

    describe(`method 'executeBid'`, () => {
        /**
         * MAKER is BID_SIDE
         * TAKER is ASK_SIDE
         */

        beforeEach(async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();

            const tokenMintingPermit: TokenMintingPermit.TypeStruct = {
                tokenId: TOKEN_ID,
                minter: takerAddr,
                currency: usdcAddr,
                price: TOKEN_PRICE,
                fee: TOKEN_FEE,
                tokenURI: TOKEN_URI,
                tokenConfig: TOKEN_CONFIG,
                participants: [institutionAddr],
                rewards: [TOKEN_PRICE],
                deadline: latestBlockTimestamp + HOUR,
            };

            await usdc.connect(taker).mintAndApprove(artToken, MaxInt256);

            await ArtTokenUtils.mint({
                artToken,
                permit: tokenMintingPermit,
                permitSigner: marketSigner,
                sender: taker,
            });

            await artToken.connect(taker).approve(marketAddr, TOKEN_ID);

            await usdc.connect(maker).mintAndApprove(marketAddr, MaxInt256);
        });

        it(`should execute the order`, async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();

            const askSideReward = ORDER_PRICE - ASK_SIDE_FEE;
            const platformReward = 100n;
            const institutionReward = ASK_SIDE_FEE - platformReward;

            const order: Order.TypeStruct = {
                side: BID_SIDE,
                collection: artTokenAddr,
                currency: usdcAddr,
                maker: makerAddr,
                tokenId: TOKEN_ID,
                price: ORDER_PRICE,
                makerFee: BID_SIDE_FEE,
                startTime: latestBlockTimestamp,
                endTime: latestBlockTimestamp + HOUR,
            };

            const orderHash = MarketUtils.hashOrder(order);

            const orderExecutionPermit: OrderExecutionPermit.TypeStruct = {
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
                permit: orderExecutionPermit,
                orderSigner: maker,
                permitSigner: marketSigner,
                sender: taker,
            });

            const orderInvalidated = await market.orderInvalidated(maker, orderHash);

            expect(orderInvalidated).equal(true);

            await expect(tx) //
                .emit(usdc, 'Transfer')
                .withArgs(makerAddr, marketAddr, ORDER_PRICE + BID_SIDE_FEE);

            await expect(tx) //
                .emit(usdc, 'Transfer')
                .withArgs(marketAddr, financierAddr, BID_SIDE_FEE);

            await expect(tx) //
                .emit(usdc, 'Transfer')
                .withArgs(marketAddr, takerAddr, askSideReward);

            await expect(tx) //
                .emit(usdc, 'Transfer')
                .withArgs(marketAddr, institutionAddr, institutionReward);

            await expect(tx) //
                .emit(usdc, 'Transfer')
                .withArgs(marketAddr, financierAddr, platformReward);

            await expect(tx) //
                .emit(artToken, 'Transfer')
                .withArgs(takerAddr, makerAddr, TOKEN_ID);

            await expect(tx) //
                .emit(market, 'BidOrderExecuted')
                .withArgs(
                    orderHash,
                    artTokenAddr,
                    usdcAddr,
                    makerAddr,
                    takerAddr,
                    TOKEN_ID,
                    ORDER_PRICE,
                );
        });

        it(`should execute the order with zero maker fee`, async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();

            const order: Order.TypeStruct = {
                side: BID_SIDE,
                collection: artTokenAddr,
                currency: usdcAddr,
                maker: makerAddr,
                tokenId: TOKEN_ID,
                price: ORDER_PRICE,
                makerFee: 0n, // Zero fee
                startTime: latestBlockTimestamp,
                endTime: latestBlockTimestamp + HOUR,
            };

            const orderHash = MarketUtils.hashOrder(order);

            const orderExecutionPermit: OrderExecutionPermit.TypeStruct = {
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
                permit: orderExecutionPermit,
                orderSigner: maker,
                permitSigner: marketSigner,
                sender: taker,
            });

            await expect(tx) //
                .emit(usdc, 'Transfer')
                .withArgs(makerAddr, marketAddr, ORDER_PRICE); // Only price, no fee from maker
        });

        it(`should execute the order with zero taker fee`, async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();

            const order: Order.TypeStruct = {
                side: BID_SIDE,
                collection: artTokenAddr,
                currency: usdcAddr,
                maker: makerAddr,
                tokenId: TOKEN_ID,
                price: ORDER_PRICE,
                makerFee: BID_SIDE_FEE,
                startTime: latestBlockTimestamp,
                endTime: latestBlockTimestamp + HOUR,
            };

            const orderHash = MarketUtils.hashOrder(order);

            const orderExecutionPermit: OrderExecutionPermit.TypeStruct = {
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
                permit: orderExecutionPermit,
                orderSigner: maker,
                permitSigner: marketSigner,
                sender: taker,
            });

            await expect(tx) //
                .emit(usdc, 'Transfer')
                .withArgs(marketAddr, takerAddr, ORDER_PRICE); // Full price to taker
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
                price: ORDER_PRICE,
                makerFee: BID_SIDE_FEE,
                startTime,
                endTime,
            };

            const orderExecutionPermit: OrderExecutionPermit.TypeStruct = {
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
                permit: orderExecutionPermit,
                orderSigner: maker,
                permitSigner: marketSigner,
                sender: taker,
            });

            await expect(tx).rejectedWith('MarketOrderOutsideOfTimeRange');
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
                price: ORDER_PRICE,
                makerFee: BID_SIDE_FEE,
                startTime,
                endTime,
            };

            const orderExecutionPermit: OrderExecutionPermit.TypeStruct = {
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
                permit: orderExecutionPermit,
                orderSigner: maker,
                permitSigner: marketSigner,
                sender: taker,
            });

            await expect(tx).rejectedWith('MarketOrderOutsideOfTimeRange');
        });

        it(`should fail if the order signer is not the maker`, async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();

            const order: Order.TypeStruct = {
                side: BID_SIDE,
                collection: artTokenAddr,
                currency: usdcAddr,
                maker: makerAddr,
                tokenId: TOKEN_ID,
                price: ORDER_PRICE,
                makerFee: BID_SIDE_FEE,
                startTime: latestBlockTimestamp,
                endTime: latestBlockTimestamp + HOUR,
            };

            const orderExecutionPermit: OrderExecutionPermit.TypeStruct = {
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
                permit: orderExecutionPermit,
                orderSigner: randomAccount, // Wrong order signer
                permitSigner: marketSigner,
                sender: taker,
            });

            await expect(tx).rejectedWith('MarketUnauthorizedOrder');
        });

        it(`should fail if the permit order hash and the order hash do not match`, async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();

            const order: Order.TypeStruct = {
                side: BID_SIDE,
                collection: artTokenAddr,
                currency: usdcAddr,
                maker: makerAddr,
                tokenId: TOKEN_ID,
                price: ORDER_PRICE,
                makerFee: BID_SIDE_FEE,
                startTime: latestBlockTimestamp,
                endTime: latestBlockTimestamp + HOUR,
            };

            const orderExecutionPermit: OrderExecutionPermit.TypeStruct = {
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
                permit: orderExecutionPermit,
                orderSigner: maker,
                permitSigner: marketSigner,
                sender: taker,
            });

            await expect(tx).rejectedWith('MarketInvalidOrderHash');
        });

        it(`should fail if the permit signer is not the market signer`, async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();

            const order: Order.TypeStruct = {
                side: BID_SIDE,
                collection: artTokenAddr,
                currency: usdcAddr,
                maker: makerAddr,
                tokenId: TOKEN_ID,
                price: ORDER_PRICE,
                makerFee: BID_SIDE_FEE,
                startTime: latestBlockTimestamp,
                endTime: latestBlockTimestamp + HOUR,
            };

            const orderExecutionPermit: OrderExecutionPermit.TypeStruct = {
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
                permit: orderExecutionPermit,
                orderSigner: maker,
                permitSigner: randomAccount, // Wrong permit signer
                sender: taker,
            });

            await expect(tx).rejectedWith('AuthorizationUnauthorizedAction');
        });

        it(`should fail if the order is invalidated`, async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();

            const order: Order.TypeStruct = {
                side: BID_SIDE,
                collection: artTokenAddr,
                currency: usdcAddr,
                maker: makerAddr,
                tokenId: TOKEN_ID,
                price: ORDER_PRICE,
                makerFee: BID_SIDE_FEE,
                startTime: latestBlockTimestamp,
                endTime: latestBlockTimestamp + HOUR,
            };

            const orderHash = MarketUtils.hashOrder(order);

            const orderExecutionPermit: OrderExecutionPermit.TypeStruct = {
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
                permit: orderExecutionPermit,
                orderSigner: maker,
                permitSigner: marketSigner,
                sender: taker,
            });

            await expect(tx).rejectedWith('MarketOrderInvalidated');
        });

        it(`should fail if the order side is not Bid`, async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();

            const order: Order.TypeStruct = {
                side: ASK_SIDE, // Wrong side
                collection: artTokenAddr,
                currency: usdcAddr,
                maker: makerAddr,
                tokenId: TOKEN_ID,
                price: ORDER_PRICE,
                makerFee: BID_SIDE_FEE,
                startTime: latestBlockTimestamp,
                endTime: latestBlockTimestamp + HOUR,
            };

            const orderExecutionPermit: OrderExecutionPermit.TypeStruct = {
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
                permit: orderExecutionPermit,
                orderSigner: maker,
                permitSigner: marketSigner,
                sender: taker,
            });

            await expect(tx).rejectedWith('MarketInvalidOrderSide');
        });

        it(`should fail if the ask side fee is greater than or equal to the price`, async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();

            const order: Order.TypeStruct = {
                side: BID_SIDE,
                collection: artTokenAddr,
                currency: usdcAddr,
                maker: makerAddr,
                tokenId: TOKEN_ID,
                price: ORDER_PRICE,
                makerFee: BID_SIDE_FEE,
                startTime: latestBlockTimestamp,
                endTime: latestBlockTimestamp + HOUR,
            };

            const orderExecutionPermit: OrderExecutionPermit.TypeStruct = {
                orderHash: MarketUtils.hashOrder(order),
                taker: takerAddr,
                takerFee: ORDER_PRICE, // Fee equals price
                participants: [institutionAddr],
                rewards: [ASK_SIDE_FEE],
                deadline: latestBlockTimestamp + HOUR,
            };

            const tx = MarketUtils.executeBid({
                market,
                order,
                permit: orderExecutionPermit,
                orderSigner: maker,
                permitSigner: marketSigner,
                sender: taker,
            });

            await expect(tx).rejectedWith('MarketInvalidAskSideFee');
        });

        it(`should fail if the currency is not allowed`, async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();

            const order: Order.TypeStruct = {
                side: BID_SIDE,
                collection: artTokenAddr,
                currency: randomAccountAddr, // Invalid currency
                maker: makerAddr,
                tokenId: TOKEN_ID,
                price: ORDER_PRICE,
                makerFee: BID_SIDE_FEE,
                startTime: latestBlockTimestamp,
                endTime: latestBlockTimestamp + HOUR,
            };

            const orderExecutionPermit: OrderExecutionPermit.TypeStruct = {
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
                permit: orderExecutionPermit,
                orderSigner: maker,
                permitSigner: marketSigner,
                sender: taker,
            });

            await expect(tx).rejectedWith('MarketCurrencyInvalid');
        });

        it(`should fail if the sender is not the permitted taker`, async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();

            const order: Order.TypeStruct = {
                side: BID_SIDE,
                collection: artTokenAddr,
                currency: usdcAddr,
                maker: makerAddr,
                tokenId: TOKEN_ID,
                price: ORDER_PRICE,
                makerFee: BID_SIDE_FEE,
                startTime: latestBlockTimestamp,
                endTime: latestBlockTimestamp + HOUR,
            };

            const orderExecutionPermit: OrderExecutionPermit.TypeStruct = {
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
                permit: orderExecutionPermit,
                orderSigner: maker,
                permitSigner: marketSigner,
                sender: taker,
            });

            await expect(tx).rejectedWith('MarketUnauthorizedAccount');
        });

        it(`should fail if the permit deadline has expired`, async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();

            const order: Order.TypeStruct = {
                side: BID_SIDE,
                collection: artTokenAddr,
                currency: usdcAddr,
                maker: makerAddr,
                tokenId: TOKEN_ID,
                price: ORDER_PRICE,
                makerFee: BID_SIDE_FEE,
                startTime: latestBlockTimestamp,
                endTime: latestBlockTimestamp + HOUR,
            };

            const orderExecutionPermit: OrderExecutionPermit.TypeStruct = {
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
                permit: orderExecutionPermit,
                orderSigner: maker,
                permitSigner: marketSigner,
                sender: taker,
            });

            await expect(tx).rejectedWith('AuthorizationDeadlineExpired');
        });

        it(`should fail if the sum of rewards is greater than the ask side fee`, async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();

            const order: Order.TypeStruct = {
                side: BID_SIDE,
                collection: artTokenAddr,
                currency: usdcAddr,
                maker: makerAddr,
                tokenId: TOKEN_ID,
                price: ORDER_PRICE,
                makerFee: BID_SIDE_FEE,
                startTime: latestBlockTimestamp,
                endTime: latestBlockTimestamp + HOUR,
            };

            const orderExecutionPermit: OrderExecutionPermit.TypeStruct = {
                orderHash: MarketUtils.hashOrder(order),
                taker: takerAddr,
                takerFee: ASK_SIDE_FEE,
                participants: [institutionAddr],
                rewards: [ASK_SIDE_FEE + 1n], // Incorrect rewards sum
                deadline: latestBlockTimestamp + HOUR,
            };

            await usdc.connect(taker).transfer(marketAddr, 1n);

            const tx = MarketUtils.executeBid({
                market,
                order,
                permit: orderExecutionPermit,
                orderSigner: maker,
                permitSigner: marketSigner,
                sender: taker,
            });

            await expect(tx).rejectedWith('CurrencyTransfersIncorrectTotalAmount');
        });

        it(`should fail if the sum of rewards is less than the ask side fee`, async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();

            const order: Order.TypeStruct = {
                side: BID_SIDE,
                collection: artTokenAddr,
                currency: usdcAddr,
                maker: makerAddr,
                tokenId: TOKEN_ID,
                price: ORDER_PRICE,
                makerFee: BID_SIDE_FEE,
                startTime: latestBlockTimestamp,
                endTime: latestBlockTimestamp + HOUR,
            };

            const orderExecutionPermit: OrderExecutionPermit.TypeStruct = {
                orderHash: MarketUtils.hashOrder(order),
                taker: takerAddr,
                takerFee: ASK_SIDE_FEE,
                participants: [institutionAddr],
                rewards: [ASK_SIDE_FEE - 1n], // Incorrect rewards sum
                deadline: latestBlockTimestamp + HOUR,
            };

            const tx = MarketUtils.executeBid({
                market,
                order,
                permit: orderExecutionPermit,
                orderSigner: maker,
                permitSigner: marketSigner,
                sender: taker,
            });

            await expect(tx).rejectedWith('CurrencyTransfersIncorrectTotalAmount');
        });

        it(`should fail if currency is ether`, async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();

            const order: Order.TypeStruct = {
                side: BID_SIDE,
                collection: artTokenAddr,
                currency: ETHER_ADDR,
                maker: makerAddr,
                tokenId: TOKEN_ID,
                price: ORDER_PRICE,
                makerFee: BID_SIDE_FEE,
                startTime: latestBlockTimestamp,
                endTime: latestBlockTimestamp + HOUR,
            };

            const orderHash = MarketUtils.hashOrder(order);

            const orderExecutionPermit: OrderExecutionPermit.TypeStruct = {
                orderHash,
                taker: takerAddr,
                takerFee: ASK_SIDE_FEE,
                participants: [institutionAddr],
                rewards: [ASK_SIDE_FEE],
                deadline: latestBlockTimestamp + HOUR,
            };

            const tx = MarketUtils.executeBid({
                market,
                order,
                permit: orderExecutionPermit,
                orderSigner: maker,
                permitSigner: marketSigner,
                sender: taker,
            });

            await expect(tx).rejectedWith('MarketCurrencyInvalid');
        });
    });

    describe(`method 'invalidateOrder'`, () => {
        it(`should invalidate the order if the sender is the maker`, async () => {
            const orderHash = randomBytes(32);

            const tx = await market.connect(maker).invalidateOrder(maker, orderHash);

            const invalidated = await market.orderInvalidated(maker, orderHash);

            expect(invalidated).equal(true);

            await expect(tx) //
                .emit(market, 'OrderInvalidated')
                .withArgs(makerAddr, orderHash);
        });

        it(`should invalidate the order if the sender is the market admin`, async () => {
            const orderHash = randomBytes(32);

            const tx = await market.connect(marketAdmin).invalidateOrder(maker, orderHash);

            const invalidated = await market.orderInvalidated(maker, orderHash);

            expect(invalidated).equal(true);

            await expect(tx) //
                .emit(market, 'OrderInvalidated')
                .withArgs(makerAddr, orderHash);
        });

        it(`should fail when trying to invalidate an already invalidated order`, async () => {
            const orderHash = randomBytes(32);

            // First invalidation
            await market.connect(maker).invalidateOrder(maker, orderHash);

            // Second invalidation attempt
            const tx = market.connect(maker).invalidateOrder(maker, orderHash);

            await expect(tx).rejectedWith('MarketOrderInvalidated');
        });

        it(`should fail if the sender is not the maker or the market admin`, async () => {
            const orderHash = randomBytes(32);

            const tx = market.connect(randomAccount).invalidateOrder(maker, orderHash);

            await expect(tx).rejectedWith('MarketUnauthorizedAccount');
        });
    });

    describe(`method 'orderInvalidated'`, () => {
        it(`should return the correct value`, async () => {
            const orderHash = randomBytes(32);

            const orderInvalidatedBefore = await market.orderInvalidated(maker, orderHash);

            expect(orderInvalidatedBefore).equal(false);

            await market.connect(maker).invalidateOrder(maker, orderHash);

            const orderInvalidatedAfter = await market.orderInvalidated(maker, orderHash);

            expect(orderInvalidatedAfter).equal(true);
        });
    });
});
