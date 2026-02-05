import { expect } from 'chai';
import { Signer, MaxInt256, ZeroAddress } from 'ethers';
import { ArtToken, AuctionHouse, USDC, Market } from '../typechain-types';
import { BuyPermitStruct } from '../types/art-token';
import { CreatePermitStruct } from '../types/auction-house';
import { MIN_FEE, MIN_PRICE } from './constants/min-price-and-fee';
import { TOTAL_SHARE } from './constants/distribution';
import { TOKEN_ID, TOKEN_URI } from './constants/art-token';
import { HOUR } from './constants/time';
import { AUCTION_ID, AUCTION_STEP } from './constants/auction-house';
import { getSigners } from './utils/get-signers';
import { getLatestBlockTimestamp } from './utils/get-latest-block-timestamp';
import { deployAll } from './utils/deploy-all';
import { ArtTokenUtils } from './utils/art-token-utils';
import { AuctionHouseUtils } from './utils/auction-house-utils';

describe('ArtToken', function () {
    let artToken: ArtToken, artTokenAddr: string;
    let auctionHouse: AuctionHouse, auctionHouseAddr: string;
    let market: Market, marketAddr: string;
    let usdc: USDC, usdcAddr: string;

    let artTokenSigner: Signer, artTokenSignerAddr: string;
    let financier: Signer, financierAddr: string;
    let institution: Signer, institutionAddr: string;
    let buyer: Signer, buyerAddr: string;
    let randomAccount: Signer, randomAccountAddr: string;

    before(async () => {
        [
            [artTokenSigner, financier, institution, buyer, randomAccount],
            [artTokenSignerAddr, financierAddr, institutionAddr, buyerAddr, randomAccountAddr],
        ] = await getSigners();
    });

    beforeEach(async () => {
        const all = await deployAll({ signer: artTokenSigner, financier });

        artToken = all.artToken;
        artTokenAddr = all.artTokenAddr;
        auctionHouse = all.auctionHouse;
        auctionHouseAddr = all.auctionHouseAddr;
        market = all.market;
        marketAddr = all.marketAddr;
        usdc = all.usdc;
        usdcAddr = all.usdcAddr;
    });

    describe(`method 'buy'`, () => {
        beforeEach(async () => {
            await usdc.connect(buyer).mintAndApprove(artToken, MaxInt256);
        });

        it(`should mint the token, distribute price, and charge a fee`, async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();

            const institutionShare = (TOTAL_SHARE / 5n) * 4n; // 80%
            const platformShare = TOTAL_SHARE / 5n; // 20%

            const price = MIN_PRICE;
            const fee = MIN_FEE;

            const buyPermit: BuyPermitStruct = {
                tokenId: TOKEN_ID,
                tokenURI: TOKEN_URI,
                sender: buyerAddr,
                price,
                fee,
                participants: [institutionAddr, financierAddr],
                shares: [institutionShare, platformShare],
                deadline: latestBlockTimestamp + HOUR,
            };

            const tx = await ArtTokenUtils.buy({
                artToken,
                permit: buyPermit,
                permitSigner: artTokenSigner,
                sender: buyer,
            });

            await expect(tx)
                .to.be.emit(usdc, 'Transfer')
                .withArgs(buyerAddr, artTokenAddr, price + fee);

            await expect(tx)
                .to.be.emit(usdc, 'Transfer')
                .withArgs(artTokenAddr, institutionAddr, (price * institutionShare) / TOTAL_SHARE);

            await expect(tx)
                .to.be.emit(usdc, 'Transfer')
                .withArgs(artTokenAddr, financierAddr, (price * platformShare) / TOTAL_SHARE);

            await expect(tx)
                .to.be.emit(usdc, 'Transfer')
                .withArgs(artTokenAddr, financierAddr, fee);

            await expect(tx)
                .to.be.emit(artToken, 'Transfer') //
                .withArgs(ZeroAddress, buyerAddr, TOKEN_ID);
        });

        it(`should fail if the token is reserved by an auction`, async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();

            const createPermit: CreatePermitStruct = {
                auctionId: AUCTION_ID,
                tokenId: TOKEN_ID,
                tokenURI: TOKEN_URI,
                price: MIN_PRICE,
                fee: MIN_FEE,
                step: AUCTION_STEP,
                endTime: latestBlockTimestamp + HOUR,
                participants: [institutionAddr],
                shares: [TOTAL_SHARE],
                deadline: latestBlockTimestamp + HOUR,
            };

            await AuctionHouseUtils.create({
                auctionHouse,
                permit: createPermit,
                permitSigner: artTokenSigner,
                sender: institution,
            });

            const buyPermit: BuyPermitStruct = {
                tokenId: TOKEN_ID,
                tokenURI: TOKEN_URI,
                sender: buyerAddr,
                price: MIN_PRICE,
                fee: MIN_FEE,
                participants: [institutionAddr],
                shares: [TOTAL_SHARE],
                deadline: latestBlockTimestamp + HOUR,
            };

            const tx = ArtTokenUtils.buy({
                artToken,
                permit: buyPermit,
                permitSigner: artTokenSigner,
                sender: buyer,
            });

            await expect(tx).to.be.rejectedWith('ArtTokenTokenReserved');
        });

        it(`should fail if the permit signer is not the art token signer`, async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();

            const institutionShare = (TOTAL_SHARE / 5n) * 4n; // 80%
            const platformShare = TOTAL_SHARE / 5n; // 20%

            const price = MIN_PRICE;
            const fee = MIN_FEE;

            const buyPermit: BuyPermitStruct = {
                tokenId: TOKEN_ID,
                tokenURI: TOKEN_URI,
                sender: buyerAddr,
                price,
                fee,
                participants: [institutionAddr, financierAddr],
                shares: [institutionShare, platformShare],
                deadline: latestBlockTimestamp + HOUR,
            };

            const tx = ArtTokenUtils.buy({
                artToken,
                permit: buyPermit,
                permitSigner: randomAccount,
                sender: buyer,
            });

            await expect(tx).to.be.rejectedWith('AuthorizationUnauthorizedAction');
        });
    });

    describe(`method 'transferFrom'`, () => {
        beforeEach(async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();

            const buyPermit: BuyPermitStruct = {
                tokenId: TOKEN_ID,
                tokenURI: TOKEN_URI,
                sender: buyerAddr,
                price: MIN_PRICE,
                fee: MIN_FEE,
                participants: [institutionAddr],
                shares: [TOTAL_SHARE],
                deadline: latestBlockTimestamp + HOUR,
            };

            await usdc.connect(buyer).mintAndApprove(artToken, MaxInt256);

            await ArtTokenUtils.buy({
                artToken,
                permit: buyPermit,
                permitSigner: artTokenSigner,
                sender: buyer,
            });
        });

        it(`should transfer to a non-contract account`, async () => {
            const tx = await artToken.connect(buyer).transferFrom(buyer, randomAccount, TOKEN_ID);

            await expect(tx)
                .to.be.emit(artToken, 'Transfer')
                .withArgs(buyerAddr, randomAccountAddr, TOKEN_ID);
        });

        it(`should transfer to a partner contract`, async () => {
            const tx = await artToken.connect(buyer).transferFrom(buyer, market, TOKEN_ID);

            await expect(tx)
                .to.be.emit(artToken, 'Transfer')
                .withArgs(buyerAddr, marketAddr, TOKEN_ID);
        });

        it(`should fail if a token is transferred to a non-partner contract`, async () => {
            const tx = artToken.connect(buyer).transferFrom(buyer, usdc, TOKEN_ID);

            await expect(tx).to.eventually.rejectedWith('ArtTokenUnauthorizedAccount');
        });
    });

    describe(`method 'approve'`, () => {
        beforeEach(async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();

            const buyPermit: BuyPermitStruct = {
                tokenId: TOKEN_ID,
                tokenURI: TOKEN_URI,
                sender: buyerAddr,
                price: MIN_PRICE,
                fee: MIN_FEE,
                participants: [institutionAddr],
                shares: [TOTAL_SHARE],
                deadline: latestBlockTimestamp + HOUR,
            };

            await usdc.connect(buyer).mintAndApprove(artToken, MaxInt256);

            await ArtTokenUtils.buy({
                artToken,
                permit: buyPermit,
                permitSigner: artTokenSigner,
                sender: buyer,
            });
        });

        it(`should provide the approval to a non-contract account`, async () => {
            const tx = await artToken.connect(buyer).approve(randomAccountAddr, TOKEN_ID);

            await expect(tx)
                .to.be.emit(artToken, 'Approval')
                .withArgs(buyerAddr, randomAccountAddr, TOKEN_ID);
        });

        it(`should provide the approval to a partner contract`, async () => {
            const tx = await artToken.connect(buyer).approve(market, TOKEN_ID);

            await expect(tx)
                .to.be.emit(artToken, 'Approval')
                .withArgs(buyerAddr, marketAddr, TOKEN_ID);
        });

        it(`should fail if approval is provided to a non-partner contract`, async () => {
            const tx = artToken.connect(buyer).approve(usdc, TOKEN_ID);

            await expect(tx).to.eventually.rejectedWith('ArtTokenUnauthorizedAccount');
        });
    });

    describe(`method 'setApprovalForAll'`, () => {
        beforeEach(async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();

            const buyPermit: BuyPermitStruct = {
                tokenId: TOKEN_ID,
                tokenURI: TOKEN_URI,
                sender: buyerAddr,
                price: MIN_PRICE,
                fee: MIN_FEE,
                participants: [institutionAddr],
                shares: [TOTAL_SHARE],
                deadline: latestBlockTimestamp + HOUR,
            };

            await usdc.connect(buyer).mintAndApprove(artToken, MaxInt256);

            await ArtTokenUtils.buy({
                artToken,
                permit: buyPermit,
                permitSigner: artTokenSigner,
                sender: buyer,
            });
        });

        it(`should provide the approval to a non-contract account`, async () => {
            const tx = await artToken.connect(buyer).setApprovalForAll(randomAccountAddr, true);

            await expect(tx)
                .to.be.emit(artToken, 'ApprovalForAll')
                .withArgs(buyerAddr, randomAccountAddr, true);
        });

        it(`should provide the approval to a partner contract`, async () => {
            const tx = await artToken.connect(buyer).setApprovalForAll(market, true);

            await expect(tx)
                .to.be.emit(artToken, 'ApprovalForAll')
                .withArgs(buyerAddr, marketAddr, true);
        });

        it(`should fail if approval is provided to a non-partner contract`, async () => {
            const tx = artToken.connect(buyer).setApprovalForAll(usdc, true);

            await expect(tx).to.eventually.rejectedWith('ArtTokenUnauthorizedAccount');
        });
    });

    describe(`method 'recipientAuthorized'`, () => {
        it(`should return 'true' for a non-contract account`, async () => {
            const authorized = await artToken.recipientAuthorized(randomAccount);

            expect(authorized).equal(true);
        });

        it(`should return 'true' for a partner contract`, async () => {
            const authorized = await artToken.recipientAuthorized(market);

            expect(authorized).equal(true);
        });

        it(`should return 'false' for a non-partner contract`, async () => {
            const authorized = await artToken.recipientAuthorized(usdc);

            expect(authorized).equal(false);
        });
    });
});
