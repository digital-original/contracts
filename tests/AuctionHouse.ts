import { expect } from 'chai';
import { Signer, MaxInt256, ZeroAddress } from 'ethers';
import { mine } from '@nomicfoundation/hardhat-network-helpers/dist/src/helpers/mine';
import { setNextBlockTimestamp } from '@nomicfoundation/hardhat-network-helpers/dist/src/helpers/time';
import { ArtToken, AuctionHouse, USDC } from '../typechain-types';
import { TokenMintingPermit } from '../typechain-types/contracts/art-token/ArtToken';
import { AuctionCreationPermit } from '../typechain-types/contracts/auction-house/AuctionHouse';
import { MIN_FEE, MIN_PRICE } from './constants/min-price-and-fee';
import { TOTAL_SHARE } from './constants/distribution';
import { AUCTION_ID, AUCTION_STEP, SECOND_AUCTION_ID } from './constants/auction-house';
import { TOKEN_CONFIG, TOKEN_ID, TOKEN_URI } from './constants/art-token';
import { HOUR } from './constants/time';
import { getSigners } from './utils/get-signers';
import { getLatestBlockTimestamp } from './utils/get-latest-block-timestamp';
import { deployAll } from './utils/deploy-all';
import { ArtTokenUtils } from './utils/art-token-utils';
import { AuctionHouseUtils } from './utils/auction-house-utils';

describe('AuctionHouse', function () {
    let auctionHouse: AuctionHouse, auctionHouseAddr: string;
    let artToken: ArtToken, artTokenAddr: string;
    let usdc: USDC, usdcAddr: string;

    let auctionHouseSigner: Signer, auctionHouseSignerAddr: string;
    let financier: Signer, financierAddr: string;
    let institution: Signer, institutionAddr: string;
    let buyer: Signer, buyerAddr: string;
    let randomAccount: Signer, randomAccountAddr: string;

    before(async () => {
        [
            [auctionHouseSigner, financier, institution, buyer, randomAccount],
            [auctionHouseSignerAddr, financierAddr, institutionAddr, buyerAddr, randomAccountAddr],
        ] = await getSigners();
    });

    beforeEach(async () => {
        const all = await deployAll({
            signer: auctionHouseSigner,
            financier,
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

            const price = MIN_PRICE;
            const fee = MIN_FEE;
            const step = AUCTION_STEP;
            const endTime = latestBlockTimestamp + HOUR;
            const participants = [institutionAddr, financierAddr];
            const shares = [(TOTAL_SHARE / 5n) * 4n, TOTAL_SHARE / 5n];

            const auctionCreationPermit: AuctionCreationPermit.TypeStruct = {
                auctionId: AUCTION_ID,
                tokenId: TOKEN_ID,
                price,
                fee,
                step,
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
                .to.be.emit(auctionHouse, 'Created')
                .withArgs(AUCTION_ID, TOKEN_ID, price, endTime);

            expect(auction.tokenId).equal(TOKEN_ID);
            expect(auction.tokenURI).equal(TOKEN_URI);
            expect(auction.buyer).equal(ZeroAddress);
            expect(auction.price).equal(price);
            expect(auction.fee).equal(fee);
            expect(auction.step).equal(step);
            expect(auction.endTime).equal(endTime);
            expect(auction.sold).equal(false);
            expect(auction.participants).to.deep.equal(participants);
            expect(auction.shares).to.deep.equal(shares);
        });

        it(`should create a new auction for a token that was not sold in the previous auction`, async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();

            const firstAuctionCreationPermit: AuctionCreationPermit.TypeStruct = {
                auctionId: AUCTION_ID,
                tokenId: TOKEN_ID,
                price: MIN_PRICE,
                fee: MIN_FEE,
                step: AUCTION_STEP,
                endTime: latestBlockTimestamp + HOUR,
                tokenURI: TOKEN_URI,
                tokenConfig: TOKEN_CONFIG,
                participants: [institutionAddr],
                shares: [TOTAL_SHARE],
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

        it(`should fail if the auction duration is less than the minimum duration`, async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();

            const nextBlockTimestamp = latestBlockTimestamp + HOUR;

            await setNextBlockTimestamp(nextBlockTimestamp);

            const minDuration = Number(await auctionHouse.MIN_DURATION());

            const auctionCreationPermit: AuctionCreationPermit.TypeStruct = {
                auctionId: AUCTION_ID,
                tokenId: TOKEN_ID,
                price: MIN_PRICE,
                fee: MIN_FEE,
                step: AUCTION_STEP,
                endTime: nextBlockTimestamp + minDuration - 1, // Wrong end time
                tokenURI: TOKEN_URI,
                tokenConfig: TOKEN_CONFIG,
                participants: [institutionAddr],
                shares: [TOTAL_SHARE],
                deadline: latestBlockTimestamp + HOUR,
            };

            const tx = AuctionHouseUtils.create({
                auctionHouse,
                permit: auctionCreationPermit,
                permitSigner: auctionHouseSigner,
                sender: institution,
            });

            await expect(tx).to.eventually.rejectedWith('AuctionHouseInvalidEndTime');
        });

        it(`should fail if the auction duration is greater than the maximum duration`, async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();

            const nextBlockTimestamp = latestBlockTimestamp + HOUR;

            await setNextBlockTimestamp(nextBlockTimestamp);

            const maxDuration = Number(await auctionHouse.MAX_DURATION());

            const auctionCreationPermit: AuctionCreationPermit.TypeStruct = {
                auctionId: AUCTION_ID,
                tokenId: TOKEN_ID,
                price: MIN_PRICE,
                fee: MIN_FEE,
                step: AUCTION_STEP,
                endTime: nextBlockTimestamp + maxDuration + 1, // Wrong end time
                tokenURI: TOKEN_URI,
                tokenConfig: TOKEN_CONFIG,
                participants: [institutionAddr],
                shares: [TOTAL_SHARE],
                deadline: latestBlockTimestamp + HOUR,
            };

            const tx = AuctionHouseUtils.create({
                auctionHouse,
                permit: auctionCreationPermit,
                permitSigner: auctionHouseSigner,
                sender: institution,
            });

            await expect(tx).to.eventually.rejectedWith('AuctionHouseInvalidEndTime');
        });

        it(`should fail if the auction already exists`, async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();

            const auctionCreationPermit: AuctionCreationPermit.TypeStruct = {
                auctionId: AUCTION_ID,
                tokenId: TOKEN_ID,
                price: MIN_PRICE,
                fee: MIN_FEE,
                step: AUCTION_STEP,
                endTime: latestBlockTimestamp + HOUR,
                tokenURI: TOKEN_URI,
                tokenConfig: TOKEN_CONFIG,
                participants: [institutionAddr],
                shares: [TOTAL_SHARE],
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

            await expect(tx).to.eventually.rejectedWith('AuctionHouseAuctionExists');
        });

        it(`should fail if the token is already in an active auction`, async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();

            const firstAuctionCreationPermit: AuctionCreationPermit.TypeStruct = {
                auctionId: AUCTION_ID,
                tokenId: TOKEN_ID,
                price: MIN_PRICE,
                fee: MIN_FEE,
                step: AUCTION_STEP,
                endTime: latestBlockTimestamp + HOUR,
                tokenURI: TOKEN_URI,
                tokenConfig: TOKEN_CONFIG,
                participants: [institutionAddr],
                shares: [TOTAL_SHARE],
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

            await expect(tx).to.eventually.rejectedWith('AuctionHouseTokenReserved');
        });

        it(`should fail if the token is in an inactive auction with a buyer`, async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();

            const firstAuctionCreationPermit: AuctionCreationPermit.TypeStruct = {
                auctionId: AUCTION_ID,
                tokenId: TOKEN_ID,
                price: MIN_PRICE,
                fee: MIN_FEE,
                step: AUCTION_STEP,
                endTime: latestBlockTimestamp + HOUR,
                tokenURI: TOKEN_URI,
                tokenConfig: TOKEN_CONFIG,
                participants: [institutionAddr],
                shares: [TOTAL_SHARE],
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

            await auctionHouse.connect(buyer).raiseInitial(AUCTION_ID, 100_000_000n);

            await setNextBlockTimestamp(firstAuctionCreationPermit.endTime);

            const tx = AuctionHouseUtils.create({
                auctionHouse,
                permit: secondAuctionCreationPermit,
                permitSigner: auctionHouseSigner,
                sender: institution,
            });

            await expect(tx).to.eventually.rejectedWith('AuctionHouseTokenReserved');
        });

        it(`should fail if the token is already minted`, async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();

            const tokenMintingPermit: TokenMintingPermit.TypeStruct = {
                tokenId: TOKEN_ID,
                minter: buyerAddr,
                price: MIN_PRICE,
                fee: MIN_FEE,
                tokenURI: TOKEN_URI,
                tokenConfig: TOKEN_CONFIG,
                participants: [institutionAddr],
                rewards: [MIN_PRICE],
                deadline: latestBlockTimestamp + HOUR,
            };

            const auctionCreationPermit: AuctionCreationPermit.TypeStruct = {
                auctionId: AUCTION_ID,
                tokenId: TOKEN_ID,
                price: MIN_PRICE,
                fee: MIN_FEE,
                step: AUCTION_STEP,
                endTime: latestBlockTimestamp + HOUR,
                tokenURI: TOKEN_URI,
                tokenConfig: TOKEN_CONFIG,
                participants: [institutionAddr],
                shares: [TOTAL_SHARE],
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

            await expect(tx).to.eventually.rejectedWith('AuctionHouseTokenReserved');
        });

        it(`should fail if the permit signer is not the auction house signer`, async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();

            const auctionCreationPermit: AuctionCreationPermit.TypeStruct = {
                auctionId: AUCTION_ID,
                tokenId: TOKEN_ID,
                price: MIN_PRICE,
                fee: MIN_FEE,
                step: AUCTION_STEP,
                endTime: latestBlockTimestamp + HOUR,
                tokenURI: TOKEN_URI,
                tokenConfig: TOKEN_CONFIG,
                participants: [institutionAddr],
                shares: [TOTAL_SHARE],
                deadline: latestBlockTimestamp + HOUR,
            };

            const tx = AuctionHouseUtils.create({
                auctionHouse,
                permit: auctionCreationPermit,
                permitSigner: randomAccount, // Wrong signer
                sender: institution,
            });

            await expect(tx).to.eventually.rejectedWith('AuthorizationUnauthorizedAction');
        });
    });

    describe(`method 'raiseInitial'`, () => {
        beforeEach(async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();

            const auctionCreationPermit: AuctionCreationPermit.TypeStruct = {
                auctionId: AUCTION_ID,
                tokenId: TOKEN_ID,
                price: MIN_PRICE,
                fee: MIN_FEE,
                step: AUCTION_STEP,
                endTime: latestBlockTimestamp + HOUR,
                tokenURI: TOKEN_URI,
                tokenConfig: TOKEN_CONFIG,
                participants: [institutionAddr],
                shares: [TOTAL_SHARE],
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
                .to.be.emit(auctionHouse, 'Raised')
                .withArgs(AUCTION_ID, auction.buyer, auction.price);

            await expect(tx)
                .to.be.emit(usdc, 'Transfer')
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

            await expect(tx).to.eventually.rejectedWith('AuctionHouseRaiseTooLow');
        });

        it(`should fail if the auction does not exist`, async () => {
            const tx = auctionHouse.connect(buyer).raiseInitial(0, 1n);

            await expect(tx).to.eventually.rejectedWith('AuctionHouseAuctionNotExist');
        });

        it(`should fail if the auction has a buyer`, async () => {
            const auction = await auctionHouse.auction(AUCTION_ID);

            await auctionHouse.connect(buyer).raiseInitial(AUCTION_ID, auction.price);

            await usdc.connect(randomAccount).mintAndApprove(auctionHouse, MaxInt256);

            const tx = auctionHouse.connect(randomAccount).raiseInitial(AUCTION_ID, auction.price);

            await expect(tx).to.eventually.rejectedWith('AuctionHouseBuyerExists');
        });

        it(`should fail if the auction has ended`, async () => {
            const auction = await auctionHouse.auction(AUCTION_ID);

            await setNextBlockTimestamp(auction.endTime);

            const tx = auctionHouse.connect(buyer).raiseInitial(AUCTION_ID, auction.price);

            await expect(tx).to.eventually.rejectedWith('AuctionHouseAuctionEnded');
        });
    });

    describe(`method 'raise'`, () => {
        beforeEach(async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();

            const auctionCreationPermit: AuctionCreationPermit.TypeStruct = {
                auctionId: AUCTION_ID,
                tokenId: TOKEN_ID,
                price: MIN_PRICE,
                fee: MIN_FEE,
                step: AUCTION_STEP,
                endTime: latestBlockTimestamp + HOUR,
                tokenURI: TOKEN_URI,
                tokenConfig: TOKEN_CONFIG,
                participants: [institutionAddr],
                shares: [TOTAL_SHARE],
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
                .to.be.emit(auctionHouse, 'Raised')
                .withArgs(AUCTION_ID, auction.buyer, auction.price);

            await expect(tx)
                .to.be.emit(usdc, 'Transfer')
                .withArgs(buyerAddr, auctionHouseAddr, auction.price + auction.fee);

            await expect(tx)
                .to.be.emit(usdc, 'Transfer')
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

            await expect(tx).to.eventually.rejectedWith('AuctionHouseRaiseTooLow');
        });

        it(`should fail if the auction does not exist`, async () => {
            const tx = auctionHouse.connect(buyer).raise(0, 2n);

            await expect(tx).to.eventually.rejectedWith('AuctionHouseAuctionNotExist');
        });

        it(`should fail if the auction has ended`, async () => {
            const { price: initialPrice, step, endTime } = await auctionHouse.auction(AUCTION_ID);

            await auctionHouse.connect(randomAccount).raiseInitial(AUCTION_ID, initialPrice);

            await setNextBlockTimestamp(endTime);

            const tx = auctionHouse.connect(buyer).raise(AUCTION_ID, initialPrice + step);

            await expect(tx).to.eventually.rejectedWith('AuctionHouseAuctionEnded');
        });

        it(`should fail if the auction does not have a buyer`, async () => {
            const { price: initialPrice, step } = await auctionHouse.auction(AUCTION_ID);

            const tx = auctionHouse.connect(buyer).raise(AUCTION_ID, initialPrice + step);

            await expect(tx).to.eventually.rejectedWith('AuctionHouseBuyerNotExists');
        });
    });

    describe(`method 'finish'`, async () => {
        beforeEach(async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();

            const auctionCreationPermit: AuctionCreationPermit.TypeStruct = {
                auctionId: AUCTION_ID,
                tokenId: TOKEN_ID,
                price: MIN_PRICE,
                fee: MIN_FEE,
                step: AUCTION_STEP,
                endTime: latestBlockTimestamp + HOUR,
                tokenURI: TOKEN_URI,
                tokenConfig: TOKEN_CONFIG,
                participants: [institutionAddr],
                shares: [TOTAL_SHARE],
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
            const { price, endTime, fee, participants, shares } =
                await auctionHouse.auction(AUCTION_ID);

            await auctionHouse.connect(buyer).raiseInitial(AUCTION_ID, price);

            await setNextBlockTimestamp(endTime);

            const tx = await auctionHouse.connect(buyer).finish(AUCTION_ID);

            const auction = await auctionHouse.auction(AUCTION_ID);

            expect(auction.sold).equal(true);

            await expect(tx) //
                .to.be.emit(auctionHouse, 'Sold')
                .withArgs(AUCTION_ID);

            await expect(tx)
                .to.be.emit(usdc, 'Transfer')
                .withArgs(auctionHouseAddr, financierAddr, fee);

            await expect(tx)
                .to.be.emit(artToken, 'Transfer')
                .withArgs(ZeroAddress, buyerAddr, TOKEN_ID);

            await expect(tx)
                .to.be.emit(usdc, 'Transfer')
                .withArgs(auctionHouseAddr, participants[0], (price * shares[0]) / TOTAL_SHARE);
        });

        it(`should fail if the auction does not exist`, async () => {
            const tx = auctionHouse.connect(buyer).finish(0);

            await expect(tx).to.eventually.rejectedWith('AuctionHouseAuctionNotExist');
        });

        it(`should fail if the token has been sold`, async () => {
            const { price, endTime } = await auctionHouse.auction(AUCTION_ID);

            await auctionHouse.connect(buyer).raiseInitial(AUCTION_ID, price);

            await setNextBlockTimestamp(endTime);

            await auctionHouse.connect(buyer).finish(AUCTION_ID);

            const tx = auctionHouse.connect(buyer).finish(AUCTION_ID);

            await expect(tx).to.eventually.rejectedWith('AuctionHouseTokenSold');
        });

        it(`should fail if the auction has not ended`, async () => {
            const { price } = await auctionHouse.auction(AUCTION_ID);

            await auctionHouse.connect(buyer).raiseInitial(AUCTION_ID, price);

            const tx = auctionHouse.connect(buyer).finish(AUCTION_ID);

            await expect(tx).to.eventually.rejectedWith('AuctionHouseAuctionNotEnded');
        });

        it(`should fail if the auction does not have a buyer`, async () => {
            const { endTime } = await auctionHouse.auction(AUCTION_ID);

            await setNextBlockTimestamp(endTime);

            const tx = auctionHouse.connect(buyer).finish(AUCTION_ID);

            await expect(tx).to.eventually.rejectedWith('AuctionHouseBuyerNotExists');
        });
    });

    describe(`method 'tokenReserved'`, () => {
        beforeEach(async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();

            const auctionCreationPermit: AuctionCreationPermit.TypeStruct = {
                auctionId: AUCTION_ID,
                tokenId: TOKEN_ID,
                price: MIN_PRICE,
                fee: MIN_FEE,
                step: AUCTION_STEP,
                endTime: latestBlockTimestamp + HOUR,
                tokenURI: TOKEN_URI,
                tokenConfig: TOKEN_CONFIG,
                participants: [institutionAddr],
                shares: [TOTAL_SHARE],
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
            const tokenReserved = await auctionHouse.tokenReserved(0);

            expect(tokenReserved).equal(false);
        });
    });
});
