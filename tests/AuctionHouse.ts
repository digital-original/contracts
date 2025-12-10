import { expect } from 'chai';
import { Signer, MaxInt256, ZeroAddress } from 'ethers';
import { mine } from '@nomicfoundation/hardhat-network-helpers/dist/src/helpers/mine';
import { setNextBlockTimestamp } from '@nomicfoundation/hardhat-network-helpers/dist/src/helpers/time';
import { ArtToken, AuctionHouse, USDC } from '../typechain-types';
import { TokenMintingPermit } from '../typechain-types/contracts/art-token/ArtToken';
import { AuctionCreationPermit } from '../typechain-types/contracts/auction-house/AuctionHouse';
import { ONE_HUNDRED, HOUR } from './constants/general';
import {
    AUCTION_FEE,
    AUCTION_ID,
    AUCTION_PRICE,
    AUCTION_STEP,
    NON_EXISTENT_AUCTION_ID,
    SECOND_AUCTION_ID,
} from './constants/auction-house';
import {
    NON_EXISTENT_TOKEN_ID,
    TOKEN_CONFIG,
    TOKEN_CREATOR_ADDR,
    TOKEN_FEE,
    TOKEN_ID,
    TOKEN_PRICE,
    TOKEN_REGULATION_MODE,
    TOKEN_URI,
} from './constants/art-token';
import { getSigners } from './utils/get-signers';
import { getLatestBlockTimestamp } from './utils/get-latest-block-timestamp';
import { deployAll } from './utils/deploy-all';
import { ArtTokenUtils } from './utils/art-token-utils';
import { AuctionHouseUtils } from './utils/auction-house-utils';

describe(`AuctionHouse`, () => {
    let auctionHouse: AuctionHouse, auctionHouseAddr: string;
    let artToken: ArtToken, artTokenAddr: string;
    let usdc: USDC, usdcAddr: string;

    let auctionHouseSigner: Signer, auctionHouseSignerAddr: string;
    let admin: Signer, adminAddr: string;
    let financier: Signer, financierAddr: string;
    let institution: Signer, institutionAddr: string;
    let buyer: Signer, buyerAddr: string;
    let randomAccount: Signer, randomAccountAddr: string;

    before(async () => {
        [
            [
                auctionHouseSigner,
                admin,
                financier,
                institution,
                buyer,
                randomAccount, //
            ],
            [
                auctionHouseSignerAddr,
                adminAddr,
                financierAddr,
                institutionAddr,
                buyerAddr,
                randomAccountAddr,
            ],
        ] = await getSigners();
    });

    beforeEach(async () => {
        const all = await deployAll({
            signer: auctionHouseSigner,
            financier,
            admin,
        });

        auctionHouse = all.auctionHouse;
        auctionHouseAddr = all.auctionHouseAddr;
        artToken = all.artToken;
        artTokenAddr = all.artTokenAddr;
        usdc = all.usdc;
        usdcAddr = all.usdcAddr;
    });

    describe(`method 'create'`, () => {
        it(`should create the auction`, async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();

            const endTime = latestBlockTimestamp + HOUR;
            const participants = [institutionAddr, financierAddr];
            const shares = [(ONE_HUNDRED / 5n) * 4n, ONE_HUNDRED / 5n];

            const auctionCreationPermit: AuctionCreationPermit.TypeStruct = {
                auctionId: AUCTION_ID,
                tokenId: TOKEN_ID,
                currency: usdcAddr,
                price: AUCTION_PRICE,
                fee: AUCTION_FEE,
                step: AUCTION_STEP,
                endTime,
                tokenURI: TOKEN_URI,
                tokenConfig: TOKEN_CONFIG,
                participants,
                shares,
                deadline: latestBlockTimestamp + HOUR,
            };

            const tx = await AuctionHouseUtils.create({
                auctionHouse,
                permit: auctionCreationPermit,
                permitSigner: auctionHouseSigner,
                sender: institution,
            });

            const auction = await auctionHouse.auction(AUCTION_ID);

            await expect(tx)
                .emit(auctionHouse, 'Created')
                .withArgs(AUCTION_ID, TOKEN_ID, AUCTION_PRICE, endTime);

            expect(auction.tokenId).equal(TOKEN_ID);
            expect(auction.tokenURI).equal(TOKEN_URI);
            expect(auction.buyer).equal(ZeroAddress);
            expect(auction.price).equal(AUCTION_PRICE);
            expect(auction.fee).equal(AUCTION_FEE);
            expect(auction.step).equal(AUCTION_STEP);
            expect(auction.endTime).equal(endTime);
            expect(auction.sold).equal(false);
            expect(auction.participants).to.deep.equal(participants);
            expect(auction.shares).to.deep.equal(shares);
            expect(auction.currency).to.deep.equal(usdcAddr);
        });

        it(`should create a new auction for a token that was not sold in the previous auction`, async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();

            const firstAuctionCreationPermit: AuctionCreationPermit.TypeStruct = {
                auctionId: AUCTION_ID,
                tokenId: TOKEN_ID,
                currency: usdcAddr,
                price: AUCTION_PRICE,
                fee: AUCTION_FEE,
                step: AUCTION_STEP,
                endTime: latestBlockTimestamp + HOUR,
                tokenURI: TOKEN_URI,
                tokenConfig: TOKEN_CONFIG,
                participants: [institutionAddr],
                shares: [ONE_HUNDRED],
                deadline: latestBlockTimestamp + HOUR,
            };

            const secondAuctionCreationPermit: AuctionCreationPermit.TypeStruct = {
                ...firstAuctionCreationPermit,
                auctionId: SECOND_AUCTION_ID,
                endTime: latestBlockTimestamp + HOUR * 2,
                deadline: latestBlockTimestamp + HOUR * 2,
            };

            await AuctionHouseUtils.create({
                auctionHouse,
                permit: firstAuctionCreationPermit,
                permitSigner: auctionHouseSigner,
                sender: institution,
            });

            await setNextBlockTimestamp(firstAuctionCreationPermit.endTime);

            await AuctionHouseUtils.create({
                auctionHouse,
                permit: secondAuctionCreationPermit,
                permitSigner: auctionHouseSigner,
                sender: institution,
            });

            const auction = await auctionHouse.auction(SECOND_AUCTION_ID);

            expect(auction.tokenId).equal(TOKEN_ID);
        });

        it(`should fail if the currency is not allowed`, async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();

            const auctionCreationPermit: AuctionCreationPermit.TypeStruct = {
                auctionId: AUCTION_ID,
                tokenId: TOKEN_ID,
                currency: randomAccountAddr, // Not allowed currency
                price: AUCTION_PRICE,
                fee: AUCTION_FEE,
                step: AUCTION_STEP,
                endTime: latestBlockTimestamp + HOUR,
                tokenURI: TOKEN_URI,
                tokenConfig: TOKEN_CONFIG,
                participants: [institutionAddr],
                shares: [ONE_HUNDRED],
                deadline: latestBlockTimestamp + HOUR,
            };

            const tx = AuctionHouseUtils.create({
                auctionHouse,
                permit: auctionCreationPermit,
                permitSigner: auctionHouseSigner,
                sender: institution,
            });

            await expect(tx).rejectedWith('AuctionHouseInvalidCurrency');
        });

        it(`should fail if the auction duration is less than the minimum duration`, async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();

            const nextBlockTimestamp = latestBlockTimestamp + HOUR;

            await setNextBlockTimestamp(nextBlockTimestamp);

            const minDuration = Number(await auctionHouse.MIN_DURATION());

            const auctionCreationPermit: AuctionCreationPermit.TypeStruct = {
                auctionId: AUCTION_ID,
                tokenId: TOKEN_ID,
                currency: usdcAddr,
                price: AUCTION_PRICE,
                fee: AUCTION_FEE,
                step: AUCTION_STEP,
                endTime: nextBlockTimestamp + minDuration - 1, // Wrong end time
                tokenURI: TOKEN_URI,
                tokenConfig: TOKEN_CONFIG,
                participants: [institutionAddr],
                shares: [ONE_HUNDRED],
                deadline: latestBlockTimestamp + HOUR,
            };

            const tx = AuctionHouseUtils.create({
                auctionHouse,
                permit: auctionCreationPermit,
                permitSigner: auctionHouseSigner,
                sender: institution,
            });

            await expect(tx).rejectedWith('AuctionHouseInvalidEndTime');
        });

        it(`should fail if the auction duration is greater than the maximum duration`, async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();

            const nextBlockTimestamp = latestBlockTimestamp + HOUR;

            await setNextBlockTimestamp(nextBlockTimestamp);

            const maxDuration = Number(await auctionHouse.MAX_DURATION());

            const auctionCreationPermit: AuctionCreationPermit.TypeStruct = {
                auctionId: AUCTION_ID,
                tokenId: TOKEN_ID,
                currency: usdcAddr,
                price: AUCTION_PRICE,
                fee: AUCTION_FEE,
                step: AUCTION_STEP,
                endTime: nextBlockTimestamp + maxDuration + 1, // Wrong end time
                tokenURI: TOKEN_URI,
                tokenConfig: TOKEN_CONFIG,
                participants: [institutionAddr],
                shares: [ONE_HUNDRED],
                deadline: latestBlockTimestamp + HOUR,
            };

            const tx = AuctionHouseUtils.create({
                auctionHouse,
                permit: auctionCreationPermit,
                permitSigner: auctionHouseSigner,
                sender: institution,
            });

            await expect(tx).rejectedWith('AuctionHouseInvalidEndTime');
        });

        it(`should fail if the auction already exists`, async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();

            const auctionCreationPermit: AuctionCreationPermit.TypeStruct = {
                auctionId: AUCTION_ID,
                tokenId: TOKEN_ID,
                currency: usdcAddr,
                price: AUCTION_PRICE,
                fee: AUCTION_FEE,
                step: AUCTION_STEP,
                endTime: latestBlockTimestamp + HOUR,
                tokenURI: TOKEN_URI,
                tokenConfig: TOKEN_CONFIG,
                participants: [institutionAddr],
                shares: [ONE_HUNDRED],
                deadline: latestBlockTimestamp + HOUR,
            };

            await AuctionHouseUtils.create({
                auctionHouse,
                permit: auctionCreationPermit,
                permitSigner: auctionHouseSigner,
                sender: institution,
            });

            const tx = AuctionHouseUtils.create({
                auctionHouse,
                permit: auctionCreationPermit,
                permitSigner: auctionHouseSigner,
                sender: institution,
            });

            await expect(tx).rejectedWith('AuctionHouseAuctionExists');
        });

        it(`should fail if the token is already in an active auction`, async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();

            const firstAuctionCreationPermit: AuctionCreationPermit.TypeStruct = {
                auctionId: AUCTION_ID,
                tokenId: TOKEN_ID,
                currency: usdcAddr,
                price: AUCTION_PRICE,
                fee: AUCTION_FEE,
                step: AUCTION_STEP,
                endTime: latestBlockTimestamp + HOUR,
                tokenURI: TOKEN_URI,
                tokenConfig: TOKEN_CONFIG,
                participants: [institutionAddr],
                shares: [ONE_HUNDRED],
                deadline: latestBlockTimestamp + HOUR,
            };

            const secondAuctionCreationPermit: AuctionCreationPermit.TypeStruct = {
                ...firstAuctionCreationPermit,
                auctionId: SECOND_AUCTION_ID,
            };

            await AuctionHouseUtils.create({
                auctionHouse,
                permit: firstAuctionCreationPermit,
                permitSigner: auctionHouseSigner,
                sender: institution,
            });

            const tx = AuctionHouseUtils.create({
                auctionHouse,
                permit: secondAuctionCreationPermit,
                permitSigner: auctionHouseSigner,
                sender: institution,
            });

            await expect(tx).rejectedWith('AuctionHouseTokenReserved');
        });

        it(`should fail if the token is in an inactive auction with a buyer`, async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();

            const firstAuctionCreationPermit: AuctionCreationPermit.TypeStruct = {
                auctionId: AUCTION_ID,
                tokenId: TOKEN_ID,
                currency: usdcAddr,
                price: AUCTION_PRICE,
                fee: AUCTION_FEE,
                step: AUCTION_STEP,
                endTime: latestBlockTimestamp + HOUR,
                tokenURI: TOKEN_URI,
                tokenConfig: TOKEN_CONFIG,
                participants: [institutionAddr],
                shares: [ONE_HUNDRED],
                deadline: latestBlockTimestamp + HOUR,
            };

            const secondAuctionCreationPermit: AuctionCreationPermit.TypeStruct = {
                ...firstAuctionCreationPermit,
                auctionId: SECOND_AUCTION_ID,
                endTime: latestBlockTimestamp + HOUR * 2,
                deadline: latestBlockTimestamp + HOUR * 2,
            };

            await AuctionHouseUtils.create({
                auctionHouse,
                permit: firstAuctionCreationPermit,
                permitSigner: auctionHouseSigner,
                sender: institution,
            });

            await usdc.connect(buyer).mintAndApprove(auctionHouse, MaxInt256);

            await auctionHouse.connect(buyer).raiseInitial(AUCTION_ID, AUCTION_PRICE);

            await setNextBlockTimestamp(firstAuctionCreationPermit.endTime);

            const tx = AuctionHouseUtils.create({
                auctionHouse,
                permit: secondAuctionCreationPermit,
                permitSigner: auctionHouseSigner,
                sender: institution,
            });

            await expect(tx).rejectedWith('AuctionHouseTokenReserved');
        });

        it(`should fail if the token is already minted`, async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();

            const tokenMintingPermit: TokenMintingPermit.TypeStruct = {
                tokenId: TOKEN_ID,
                minter: buyerAddr,
                currency: usdcAddr,
                price: TOKEN_PRICE,
                fee: TOKEN_FEE,
                tokenURI: TOKEN_URI,
                tokenConfig: TOKEN_CONFIG,
                participants: [institutionAddr],
                rewards: [TOKEN_PRICE],
                deadline: latestBlockTimestamp + HOUR,
            };

            const auctionCreationPermit: AuctionCreationPermit.TypeStruct = {
                auctionId: AUCTION_ID,
                tokenId: TOKEN_ID,
                currency: usdcAddr,
                price: AUCTION_PRICE,
                fee: AUCTION_FEE,
                step: AUCTION_STEP,
                endTime: latestBlockTimestamp + HOUR,
                tokenURI: TOKEN_URI,
                tokenConfig: TOKEN_CONFIG,
                participants: [institutionAddr],
                shares: [ONE_HUNDRED],
                deadline: latestBlockTimestamp + HOUR,
            };

            await usdc.connect(buyer).mintAndApprove(artToken, MaxInt256);

            await ArtTokenUtils.mint({
                artToken,
                permit: tokenMintingPermit,
                permitSigner: auctionHouseSigner,
                sender: buyer,
            });

            const tx = AuctionHouseUtils.create({
                auctionHouse,
                permit: auctionCreationPermit,
                permitSigner: auctionHouseSigner,
                sender: institution,
            });

            await expect(tx).rejectedWith('AuctionHouseTokenReserved');
        });

        it(`should fail if the permit signer is not the auction house signer`, async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();

            const auctionCreationPermit: AuctionCreationPermit.TypeStruct = {
                auctionId: AUCTION_ID,
                tokenId: TOKEN_ID,
                currency: usdcAddr,
                price: TOKEN_PRICE,
                fee: TOKEN_FEE,
                step: AUCTION_STEP,
                endTime: latestBlockTimestamp + HOUR,
                tokenURI: TOKEN_URI,
                tokenConfig: TOKEN_CONFIG,
                participants: [institutionAddr],
                shares: [ONE_HUNDRED],
                deadline: latestBlockTimestamp + HOUR,
            };

            const tx = AuctionHouseUtils.create({
                auctionHouse,
                permit: auctionCreationPermit,
                permitSigner: randomAccount, // Wrong signer
                sender: institution,
            });

            await expect(tx).rejectedWith('AuthorizationUnauthorizedAction');
        });
    });

    describe(`method 'raiseInitial'`, () => {
        beforeEach(async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();

            const auctionCreationPermit: AuctionCreationPermit.TypeStruct = {
                auctionId: AUCTION_ID,
                tokenId: TOKEN_ID,
                currency: usdcAddr,
                price: AUCTION_PRICE,
                fee: AUCTION_FEE,
                step: AUCTION_STEP,
                endTime: latestBlockTimestamp + HOUR,
                tokenURI: TOKEN_URI,
                tokenConfig: TOKEN_CONFIG,
                participants: [institutionAddr],
                shares: [ONE_HUNDRED],
                deadline: latestBlockTimestamp + HOUR,
            };

            await AuctionHouseUtils.create({
                auctionHouse,
                permit: auctionCreationPermit,
                permitSigner: auctionHouseSigner,
                sender: institution,
            });

            await usdc.connect(buyer).mintAndApprove(auctionHouse, MaxInt256);
        });

        it(`should raise if the new price is equal to the initial price`, async () => {
            const { price: initialPrice } = await auctionHouse.auction(AUCTION_ID);

            const newPrice = initialPrice;

            const tx = await auctionHouse.connect(buyer).raiseInitial(AUCTION_ID, newPrice);

            const auction = await auctionHouse.auction(AUCTION_ID);

            expect(auction.buyer).equal(buyerAddr);
            expect(auction.price).equal(newPrice);

            await expect(tx)
                .emit(auctionHouse, 'Raised')
                .withArgs(AUCTION_ID, auction.buyer, auction.price);

            await expect(tx)
                .emit(usdc, 'Transfer')
                .withArgs(buyerAddr, auctionHouseAddr, auction.price + auction.fee);
        });

        it(`should raise if the new price is greater than the initial price`, async () => {
            const { price: initialPrice } = await auctionHouse.auction(AUCTION_ID);

            const newPrice = initialPrice + 1n;

            await auctionHouse.connect(buyer).raiseInitial(AUCTION_ID, newPrice);

            const auction = await auctionHouse.auction(AUCTION_ID);

            expect(auction.buyer).equal(buyerAddr);
            expect(auction.price).equal(newPrice);
        });

        it(`should fail if the new price is lower than the initial price`, async () => {
            const { price: initialPrice } = await auctionHouse.auction(AUCTION_ID);

            const newPrice = initialPrice - 1n;

            const tx = auctionHouse.connect(buyer).raiseInitial(AUCTION_ID, newPrice);

            await expect(tx).rejectedWith('AuctionHouseRaiseTooLow');
        });

        it(`should fail if the auction does not exist`, async () => {
            const tx = auctionHouse
                .connect(buyer)
                .raiseInitial(NON_EXISTENT_AUCTION_ID, AUCTION_PRICE);

            await expect(tx).rejectedWith('AuctionHouseAuctionNotExist');
        });

        it(`should fail if the auction has a buyer`, async () => {
            const auction = await auctionHouse.auction(AUCTION_ID);

            await auctionHouse.connect(buyer).raiseInitial(AUCTION_ID, auction.price);

            await usdc.connect(randomAccount).mintAndApprove(auctionHouse, MaxInt256);

            const tx = auctionHouse.connect(randomAccount).raiseInitial(AUCTION_ID, auction.price);

            await expect(tx).rejectedWith('AuctionHouseBuyerExists');
        });

        it(`should fail if the auction has ended`, async () => {
            const auction = await auctionHouse.auction(AUCTION_ID);

            await setNextBlockTimestamp(auction.endTime);

            const tx = auctionHouse.connect(buyer).raiseInitial(AUCTION_ID, auction.price);

            await expect(tx).rejectedWith('AuctionHouseAuctionEnded');
        });

        it.skip(`should fail if the buyer is unauthorized`, async () => {
            // TODO
        });
    });

    describe(`method 'raise'`, () => {
        beforeEach(async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();

            const auctionCreationPermit: AuctionCreationPermit.TypeStruct = {
                auctionId: AUCTION_ID,
                tokenId: TOKEN_ID,
                currency: usdcAddr,
                price: AUCTION_PRICE,
                fee: AUCTION_FEE,
                step: AUCTION_STEP,
                endTime: latestBlockTimestamp + HOUR,
                tokenURI: TOKEN_URI,
                tokenConfig: TOKEN_CONFIG,
                participants: [institutionAddr],
                shares: [ONE_HUNDRED],
                deadline: latestBlockTimestamp + HOUR,
            };

            await AuctionHouseUtils.create({
                auctionHouse,
                permit: auctionCreationPermit,
                permitSigner: auctionHouseSigner,
                sender: institution,
            });

            await usdc.connect(buyer).mintAndApprove(auctionHouse, MaxInt256);
            await usdc.connect(randomAccount).mintAndApprove(auctionHouse, MaxInt256);
        });

        it(`should raise if the new price is equal to the sum of the old price and the step`, async () => {
            const { price: initialPrice, step, fee } = await auctionHouse.auction(AUCTION_ID);

            await auctionHouse.connect(randomAccount).raiseInitial(AUCTION_ID, initialPrice);

            const newPrice = initialPrice + step;

            const tx = await auctionHouse.connect(buyer).raise(AUCTION_ID, newPrice);

            const auction = await auctionHouse.auction(AUCTION_ID);

            expect(auction.buyer).equal(buyerAddr);
            expect(auction.price).equal(newPrice);

            await expect(tx)
                .emit(auctionHouse, 'Raised')
                .withArgs(AUCTION_ID, auction.buyer, auction.price);

            await expect(tx)
                .emit(usdc, 'Transfer')
                .withArgs(buyerAddr, auctionHouseAddr, auction.price + auction.fee);

            await expect(tx)
                .emit(usdc, 'Transfer')
                .withArgs(auctionHouseAddr, randomAccountAddr, initialPrice + fee);
        });

        it(`should raise if the new price is greater than the sum of the old price and the step`, async () => {
            const { price: initialPrice, step } = await auctionHouse.auction(AUCTION_ID);

            await auctionHouse.connect(randomAccount).raiseInitial(AUCTION_ID, initialPrice);

            const newPrice = initialPrice + step + 1n;

            await auctionHouse.connect(buyer).raise(AUCTION_ID, newPrice);

            const auction = await auctionHouse.auction(AUCTION_ID);

            expect(auction.buyer).equal(buyerAddr);
            expect(auction.price).equal(newPrice);
        });

        it(`should fail if the new price is lower than the sum of the old price and the step`, async () => {
            const { price: initialPrice, step } = await auctionHouse.auction(AUCTION_ID);

            await auctionHouse.connect(randomAccount).raiseInitial(AUCTION_ID, initialPrice);

            const newPrice = initialPrice + step - 1n;

            const tx = auctionHouse.connect(buyer).raise(AUCTION_ID, newPrice);

            await expect(tx).rejectedWith('AuctionHouseRaiseTooLow');
        });

        it(`should fail if the auction does not exist`, async () => {
            const tx = auctionHouse.connect(buyer).raise(NON_EXISTENT_AUCTION_ID, AUCTION_PRICE);

            await expect(tx).rejectedWith('AuctionHouseAuctionNotExist');
        });

        it(`should fail if the auction has ended`, async () => {
            const { price: initialPrice, step, endTime } = await auctionHouse.auction(AUCTION_ID);

            await auctionHouse.connect(randomAccount).raiseInitial(AUCTION_ID, initialPrice);

            await setNextBlockTimestamp(endTime);

            const tx = auctionHouse.connect(buyer).raise(AUCTION_ID, initialPrice + step);

            await expect(tx).rejectedWith('AuctionHouseAuctionEnded');
        });

        it(`should fail if the auction does not have a buyer`, async () => {
            const { price: initialPrice, step } = await auctionHouse.auction(AUCTION_ID);

            const tx = auctionHouse.connect(buyer).raise(AUCTION_ID, initialPrice + step);

            await expect(tx).rejectedWith('AuctionHouseBuyerNotExists');
        });

        it.skip(`should fail if the buyer is unauthorized`, async () => {
            // TODO
        });
    });

    describe(`method 'finish'`, async () => {
        beforeEach(async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();

            const auctionCreationPermit: AuctionCreationPermit.TypeStruct = {
                auctionId: AUCTION_ID,
                tokenId: TOKEN_ID,
                currency: usdcAddr,
                price: AUCTION_PRICE,
                fee: AUCTION_FEE,
                step: AUCTION_STEP,
                endTime: latestBlockTimestamp + HOUR,
                tokenURI: TOKEN_URI,
                tokenConfig: TOKEN_CONFIG,
                participants: [institutionAddr],
                shares: [ONE_HUNDRED],
                deadline: latestBlockTimestamp + HOUR,
            };

            await AuctionHouseUtils.create({
                auctionHouse,
                permit: auctionCreationPermit,
                permitSigner: auctionHouseSigner,
                sender: institution,
            });

            await usdc.connect(buyer).mintAndApprove(auctionHouse, MaxInt256);
        });

        it(`should finish the auction`, async () => {
            const { price, endTime, fee } = await auctionHouse.auction(AUCTION_ID);

            await auctionHouse.connect(buyer).raiseInitial(AUCTION_ID, price);

            await setNextBlockTimestamp(endTime);

            const tx = await auctionHouse.connect(buyer).finish(AUCTION_ID);

            const auction = await auctionHouse.auction(AUCTION_ID);

            expect(auction.sold).equal(true);

            await expect(tx) //
                .emit(auctionHouse, 'Sold')
                .withArgs(AUCTION_ID);

            await expect(tx) //
                .emit(artToken, 'Transfer')
                .withArgs(ZeroAddress, buyerAddr, TOKEN_ID);

            await expect(tx) //
                .emit(usdc, 'Transfer')
                .withArgs(auctionHouseAddr, financierAddr, fee);
        });

        it(`should mint the token with correct token config`, async () => {
            const { price, endTime } = await auctionHouse.auction(AUCTION_ID);

            await auctionHouse.connect(buyer).raiseInitial(AUCTION_ID, price);

            await setNextBlockTimestamp(endTime);

            await auctionHouse.connect(buyer).finish(AUCTION_ID);

            const tokenCreator = await artToken.tokenCreator(TOKEN_ID);
            const tokenRegulationMode = await artToken.tokenRegulationMode(TOKEN_ID);

            expect(tokenCreator).equal(TOKEN_CREATOR_ADDR);
            expect(tokenRegulationMode).equal(TOKEN_REGULATION_MODE);
        });

        it(`should fail if the auction does not exist`, async () => {
            const tx = auctionHouse.connect(buyer).finish(NON_EXISTENT_AUCTION_ID);

            await expect(tx).rejectedWith('AuctionHouseAuctionNotExist');
        });

        it(`should fail if the token has been sold`, async () => {
            const { price, endTime } = await auctionHouse.auction(AUCTION_ID);

            await auctionHouse.connect(buyer).raiseInitial(AUCTION_ID, price);

            await setNextBlockTimestamp(endTime);

            await auctionHouse.connect(buyer).finish(AUCTION_ID);

            const tx = auctionHouse.connect(buyer).finish(AUCTION_ID);

            await expect(tx).rejectedWith('AuctionHouseTokenSold');
        });

        it(`should fail if the auction has not ended`, async () => {
            const { price } = await auctionHouse.auction(AUCTION_ID);

            await auctionHouse.connect(buyer).raiseInitial(AUCTION_ID, price);

            const tx = auctionHouse.connect(buyer).finish(AUCTION_ID);

            await expect(tx).rejectedWith('AuctionHouseAuctionNotEnded');
        });

        it(`should fail if the auction does not have a buyer`, async () => {
            const { endTime } = await auctionHouse.auction(AUCTION_ID);

            await setNextBlockTimestamp(endTime);

            const tx = auctionHouse.connect(buyer).finish(AUCTION_ID);

            await expect(tx).rejectedWith('AuctionHouseBuyerNotExists');
        });
    });

    describe(`method 'cancel'`, () => {
        beforeEach(async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();

            const auctionCreationPermit: AuctionCreationPermit.TypeStruct = {
                auctionId: AUCTION_ID,
                tokenId: TOKEN_ID,
                currency: usdcAddr,
                price: AUCTION_PRICE,
                fee: AUCTION_FEE,
                step: AUCTION_STEP,
                endTime: latestBlockTimestamp + HOUR,
                tokenURI: TOKEN_URI,
                tokenConfig: TOKEN_CONFIG,
                participants: [institutionAddr],
                shares: [ONE_HUNDRED],
                deadline: latestBlockTimestamp + HOUR,
            };

            await AuctionHouseUtils.create({
                auctionHouse,
                permit: auctionCreationPermit,
                permitSigner: auctionHouseSigner,
                sender: institution,
            });

            await usdc.connect(buyer).mintAndApprove(auctionHouse, MaxInt256);
        });

        it(`should cancel the auction by setting block timestamp as the end time`, async () => {
            const { endTime: originalEndTime } = await auctionHouse.auction(AUCTION_ID);

            const tx = await auctionHouse.connect(admin).cancel(AUCTION_ID);

            const blockTimestamp = await getLatestBlockTimestamp();
            const { endTime } = await auctionHouse.auction(AUCTION_ID);
            const tokenReserved = await auctionHouse.tokenReserved(TOKEN_ID);

            expect(endTime).lessThan(originalEndTime);
            expect(endTime).equal(blockTimestamp);
            expect(tokenReserved).equal(false);

            await expect(tx) //
                .emit(auctionHouse, 'Cancelled')
                .withArgs(AUCTION_ID);
        });

        it(`should fail if the auction does not exist`, async () => {
            const tx = auctionHouse.connect(admin).cancel(SECOND_AUCTION_ID);

            await expect(tx).rejectedWith('AuctionHouseAuctionNotExist');
        });

        it(`should fail if the auction has a buyer`, async () => {
            await auctionHouse.connect(buyer).raiseInitial(AUCTION_ID, AUCTION_PRICE);

            const tx = auctionHouse.connect(admin).cancel(AUCTION_ID);

            await expect(tx).rejectedWith('AuctionHouseBuyerExists');
        });

        it(`should fail if the auction has already ended`, async () => {
            const { endTime } = await auctionHouse.auction(AUCTION_ID);

            await setNextBlockTimestamp(endTime);

            const tx = auctionHouse.connect(admin).cancel(AUCTION_ID);

            await expect(tx).rejectedWith('AuctionHouseAuctionEnded');
        });

        it(`should fail if the sender is not the auction house admin`, async () => {
            const tx = auctionHouse.connect(randomAccount).cancel(AUCTION_ID);

            await expect(tx).rejectedWith('RoleSystemUnauthorizedAccount');
        });
    });

    describe(`method 'tokenReserved'`, () => {
        beforeEach(async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();

            const auctionCreationPermit: AuctionCreationPermit.TypeStruct = {
                auctionId: AUCTION_ID,
                tokenId: TOKEN_ID,
                currency: usdcAddr,
                price: AUCTION_PRICE,
                fee: AUCTION_FEE,
                step: AUCTION_STEP,
                endTime: latestBlockTimestamp + HOUR,
                tokenURI: TOKEN_URI,
                tokenConfig: TOKEN_CONFIG,
                participants: [institutionAddr],
                shares: [ONE_HUNDRED],
                deadline: latestBlockTimestamp + HOUR,
            };

            await AuctionHouseUtils.create({
                auctionHouse,
                permit: auctionCreationPermit,
                permitSigner: auctionHouseSigner,
                sender: institution,
            });

            await usdc.connect(buyer).mintAndApprove(auctionHouse, MaxInt256);
        });

        it(`should return 'true' for a token that is in an active auction`, async () => {
            const tokenReserved = await auctionHouse.tokenReserved(TOKEN_ID);

            expect(tokenReserved).equal(true);
        });

        it(`should return 'true' for a token that is in an inactive auction with a buyer`, async () => {
            const { price, endTime } = await auctionHouse.auction(AUCTION_ID);

            await auctionHouse.connect(buyer).raiseInitial(AUCTION_ID, price);

            await setNextBlockTimestamp(endTime);

            const tokenReserved = await auctionHouse.tokenReserved(TOKEN_ID);

            expect(tokenReserved).equal(true);
        });

        it(`should return 'false' for a token that has not been sold`, async () => {
            const { endTime } = await auctionHouse.auction(AUCTION_ID);

            await setNextBlockTimestamp(endTime);
            await mine();

            const tokenReserved = await auctionHouse.tokenReserved(TOKEN_ID);

            expect(tokenReserved).equal(false);
        });

        it(`should return 'false' for a token that has never been put up for auction`, async () => {
            const tokenReserved = await auctionHouse.tokenReserved(NON_EXISTENT_TOKEN_ID);

            expect(tokenReserved).equal(false);
        });
    });

    describe(`ShareDistributor`, () => {
        beforeEach(async () => {
            await usdc.connect(buyer).mintAndApprove(auctionHouse, MaxInt256);
        });

        it(`should distribute the price among participants according to shares`, async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();
            const endTime = latestBlockTimestamp + HOUR;

            const institutionShare = (ONE_HUNDRED / 5n) * 4n; // 80%
            const platformShare = ONE_HUNDRED / 5n; // 20%

            const auctionCreationPermit: AuctionCreationPermit.TypeStruct = {
                auctionId: AUCTION_ID,
                tokenId: TOKEN_ID,
                currency: usdcAddr,
                price: AUCTION_PRICE,
                fee: AUCTION_FEE,
                step: AUCTION_STEP,
                endTime: endTime,
                tokenURI: TOKEN_URI,
                tokenConfig: TOKEN_CONFIG,
                participants: [institutionAddr, financierAddr],
                shares: [institutionShare, platformShare],
                deadline: latestBlockTimestamp + HOUR,
            };

            await AuctionHouseUtils.create({
                auctionHouse,
                permit: auctionCreationPermit,
                permitSigner: auctionHouseSigner,
                sender: institution,
            });

            await auctionHouse.connect(buyer).raiseInitial(AUCTION_ID, AUCTION_PRICE);

            await setNextBlockTimestamp(endTime);

            const tx = await auctionHouse.connect(buyer).finish(AUCTION_ID);

            const institutionReward = (AUCTION_PRICE * institutionShare) / ONE_HUNDRED;
            const platformReward = (AUCTION_PRICE * platformShare) / ONE_HUNDRED;

            await expect(tx)
                .emit(usdc, 'Transfer')
                .withArgs(auctionHouseAddr, institutionAddr, institutionReward);

            await expect(tx)
                .emit(usdc, 'Transfer')
                .withArgs(auctionHouseAddr, financierAddr, platformReward);
        });

        it(`should send the remainder of the division to the last participant`, async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();
            const endTime = latestBlockTimestamp + HOUR;

            const institutionShare = (ONE_HUNDRED / 5n) * 4n; // 80%
            const platformShare = ONE_HUNDRED / 5n; // 20%

            const remainder = 1n;
            const priceWithRemainder = 100_000_000n + remainder;

            const auctionCreationPermit: AuctionCreationPermit.TypeStruct = {
                auctionId: AUCTION_ID,
                tokenId: TOKEN_ID,
                currency: usdcAddr,
                price: priceWithRemainder,
                fee: AUCTION_FEE,
                step: AUCTION_STEP,
                endTime: endTime,
                tokenURI: TOKEN_URI,
                tokenConfig: TOKEN_CONFIG,
                participants: [institutionAddr, financierAddr],
                shares: [institutionShare, platformShare],
                deadline: latestBlockTimestamp + HOUR,
            };

            await AuctionHouseUtils.create({
                auctionHouse,
                permit: auctionCreationPermit,
                permitSigner: auctionHouseSigner,
                sender: institution,
            });

            await auctionHouse.connect(buyer).raiseInitial(AUCTION_ID, priceWithRemainder);

            await setNextBlockTimestamp(endTime);

            const tx = await auctionHouse.connect(buyer).finish(AUCTION_ID);

            const institutionReward = (priceWithRemainder * institutionShare) / ONE_HUNDRED;
            const platformReward = (priceWithRemainder * platformShare) / ONE_HUNDRED + remainder;

            await expect(tx)
                .emit(usdc, 'Transfer')
                .withArgs(auctionHouseAddr, institutionAddr, institutionReward);

            await expect(tx)
                .emit(usdc, 'Transfer')
                .withArgs(auctionHouseAddr, financierAddr, platformReward);
        });

        it(`should fail if the number of participants and the number of shares do not match`, async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();

            const auctionCreationPermit: AuctionCreationPermit.TypeStruct = {
                auctionId: AUCTION_ID,
                tokenId: TOKEN_ID,
                currency: usdcAddr,
                price: AUCTION_PRICE,
                fee: AUCTION_FEE,
                step: AUCTION_STEP,
                endTime: latestBlockTimestamp + HOUR,
                tokenURI: TOKEN_URI,
                tokenConfig: TOKEN_CONFIG,
                participants: [institutionAddr, financierAddr],
                shares: [ONE_HUNDRED],
                deadline: latestBlockTimestamp + HOUR,
            };

            const tx = AuctionHouseUtils.create({
                auctionHouse,
                permit: auctionCreationPermit,
                permitSigner: auctionHouseSigner,
                sender: institution,
            });

            await expect(tx).rejectedWith('ShareDistributorParticipantsSharesMismatch');
        });

        it(`should fail if the total share is greater than 100%`, async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();

            const institutionShare = (ONE_HUNDRED / 5n) * 4n; // 80%
            const platformShare = ONE_HUNDRED / 4n; // 25%

            const auctionCreationPermit: AuctionCreationPermit.TypeStruct = {
                auctionId: AUCTION_ID,
                tokenId: TOKEN_ID,
                currency: usdcAddr,
                price: AUCTION_PRICE,
                fee: AUCTION_FEE,
                step: AUCTION_STEP,
                endTime: latestBlockTimestamp + HOUR,
                tokenURI: TOKEN_URI,
                tokenConfig: TOKEN_CONFIG,
                participants: [institutionAddr, financierAddr],
                shares: [institutionShare, platformShare],
                deadline: latestBlockTimestamp + HOUR,
            };

            const tx = AuctionHouseUtils.create({
                auctionHouse,
                permit: auctionCreationPermit,
                permitSigner: auctionHouseSigner,
                sender: institution,
            });

            await expect(tx).rejectedWith('ShareDistributorSharesSumInvalid(10500)');
        });

        it(`should fail if the total share is less than 100%`, async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();

            const institutionShare = (ONE_HUNDRED / 5n) * 3n; // 60%
            const platformShare = ONE_HUNDRED / 5n; // 20%

            const auctionCreationPermit: AuctionCreationPermit.TypeStruct = {
                auctionId: AUCTION_ID,
                tokenId: TOKEN_ID,
                currency: usdcAddr,
                price: AUCTION_PRICE,
                fee: AUCTION_FEE,
                step: AUCTION_STEP,
                endTime: latestBlockTimestamp + HOUR,
                tokenURI: TOKEN_URI,
                tokenConfig: TOKEN_CONFIG,
                participants: [institutionAddr, financierAddr],
                shares: [institutionShare, platformShare],
                deadline: latestBlockTimestamp + HOUR,
            };

            const tx = AuctionHouseUtils.create({
                auctionHouse,
                permit: auctionCreationPermit,
                permitSigner: auctionHouseSigner,
                sender: institution,
            });

            await expect(tx).rejectedWith('ShareDistributorSharesSumInvalid(8000)');
        });

        it(`should fail if shares and participants are missing`, async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();

            const auctionCreationPermit: AuctionCreationPermit.TypeStruct = {
                auctionId: AUCTION_ID,
                tokenId: TOKEN_ID,
                currency: usdcAddr,
                price: AUCTION_PRICE,
                fee: AUCTION_FEE,
                step: AUCTION_STEP,
                endTime: latestBlockTimestamp + HOUR,
                tokenURI: TOKEN_URI,
                tokenConfig: TOKEN_CONFIG,
                participants: [],
                shares: [],
                deadline: latestBlockTimestamp + HOUR,
            };

            const tx = AuctionHouseUtils.create({
                auctionHouse,
                permit: auctionCreationPermit,
                permitSigner: auctionHouseSigner,
                sender: institution,
            });

            await expect(tx).rejectedWith('ShareDistributorSharesSumInvalid(0)');
        });

        it(`should fail if a participant address is zero`, async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();

            const auctionCreationPermit: AuctionCreationPermit.TypeStruct = {
                auctionId: AUCTION_ID,
                tokenId: TOKEN_ID,
                currency: usdcAddr,
                price: AUCTION_PRICE,
                fee: AUCTION_FEE,
                step: AUCTION_STEP,
                endTime: latestBlockTimestamp + HOUR,
                tokenURI: TOKEN_URI,
                tokenConfig: TOKEN_CONFIG,
                participants: [institutionAddr, ZeroAddress],
                shares: [ONE_HUNDRED / 2n, ONE_HUNDRED / 2n],
                deadline: latestBlockTimestamp + HOUR,
            };

            const tx = AuctionHouseUtils.create({
                auctionHouse,
                permit: auctionCreationPermit,
                permitSigner: auctionHouseSigner,
                sender: institution,
            });

            await expect(tx).rejectedWith('ShareDistributorZeroAddress');
        });

        it(`should fail if a participant has a zero share`, async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();

            const auctionCreationPermit: AuctionCreationPermit.TypeStruct = {
                auctionId: AUCTION_ID,
                tokenId: TOKEN_ID,
                currency: usdcAddr,
                price: AUCTION_PRICE,
                fee: AUCTION_FEE,
                step: AUCTION_STEP,
                endTime: latestBlockTimestamp + HOUR,
                tokenURI: TOKEN_URI,
                tokenConfig: TOKEN_CONFIG,
                participants: [institutionAddr, financierAddr],
                shares: [ONE_HUNDRED, 0n],
                deadline: latestBlockTimestamp + HOUR,
            };

            const tx = AuctionHouseUtils.create({
                auctionHouse,
                permit: auctionCreationPermit,
                permitSigner: auctionHouseSigner,
                sender: institution,
            });

            await expect(tx).rejectedWith('ShareDistributorZeroShare');
        });
    });
});
