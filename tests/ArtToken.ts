import { expect } from 'chai';
import { Signer, MaxInt256, ZeroAddress } from 'ethers';
import { ArtToken, AuctionHouse, USDC, Market } from '../typechain-types';
import { AuctionCreationPermit } from '../typechain-types/contracts/auction-house/AuctionHouse';
import { TokenMintingPermit } from '../typechain-types/contracts/art-token/ArtToken';
import { HOUR, ONE_HUNDRED } from './constants/general';
import { TOKEN_CONFIG, TOKEN_FEE, TOKEN_ID, TOKEN_PRICE, TOKEN_URI } from './constants/art-token';
import { AUCTION_FEE, AUCTION_ID, AUCTION_PRICE, AUCTION_STEP } from './constants/auction-house';
import { getSigners } from './utils/get-signers';
import { getLatestBlockTimestamp } from './utils/get-latest-block-timestamp';
import { deployAll } from './utils/deploy-all';
import { ArtTokenUtils } from './utils/art-token-utils';
import { AuctionHouseUtils } from './utils/auction-house-utils';

describe('ArtToken', function () {
    /**
     * TODO:
     *
     * > CurrencyManager:
     *  - should fail if the currency is not allowed
     *
     * > ArtTokenRoyaltyManager:
     *  - should return correct creator address
     *  - should return correct default creator address
     *  - should return correct royalty amount
     *
     * > `setTokenURI` method:
     *  - should set the token URI
     *  - should fail if the caller is the art token admin
     *  - should fail if the token does not exist
     *
     * > `mintFromAuctionHouse` method:
     *  - should fail if the caller is not the auction house
     *
     * > `mint` method:
     *  - should fail if the caller is not the allowed minter
     *  - should fail if the currency is not allowed
     *  - check the set token config
     *
     * > ArtTokenConfigManager:
     *  > `updateTokenCreator` method:
     *    - should update the token creator
     *    - should fail if the caller is not the art token admin
     *  > `updateTokenRegulationMode` method:
     *    - should update the token regulation mode
     *    - should fail if the caller is not the art token admin
     *
     *  (-) should return correct default creator address
     *  (-) should return correct default regulation mode
     *  - should return correct token-specific creator address
     *  - should return correct token-specific regulation mode
     *
     */
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

    describe(`method 'mint'`, () => {
        beforeEach(async () => {
            await usdc.connect(buyer).mintAndApprove(artToken, MaxInt256);
        });

        it(`should mint the token, distribute price, and charge a fee`, async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();

            const institutionReward = (TOKEN_PRICE / 5n) * 4n; // 80%
            const platformReward = TOKEN_PRICE / 5n; // 20%

            const tokenMintingPermit: TokenMintingPermit.TypeStruct = {
                tokenId: TOKEN_ID,
                minter: buyerAddr,
                currency: usdcAddr,
                price: TOKEN_PRICE,
                fee: TOKEN_FEE,
                tokenURI: TOKEN_URI,
                tokenConfig: TOKEN_CONFIG,
                participants: [institutionAddr, financierAddr],
                rewards: [institutionReward, platformReward],
                deadline: latestBlockTimestamp + HOUR,
            };

            const tx = await ArtTokenUtils.mint({
                artToken,
                permit: tokenMintingPermit,
                permitSigner: artTokenSigner,
                sender: buyer,
            });

            await expect(tx)
                .to.be.emit(usdc, 'Transfer')
                .withArgs(buyerAddr, artTokenAddr, TOKEN_PRICE + TOKEN_FEE);

            await expect(tx)
                .to.be.emit(usdc, 'Transfer')
                .withArgs(artTokenAddr, institutionAddr, institutionReward);

            await expect(tx)
                .to.be.emit(usdc, 'Transfer')
                .withArgs(artTokenAddr, financierAddr, platformReward);

            await expect(tx)
                .to.be.emit(usdc, 'Transfer')
                .withArgs(artTokenAddr, financierAddr, TOKEN_FEE);

            await expect(tx)
                .to.be.emit(artToken, 'Transfer')
                .withArgs(ZeroAddress, buyerAddr, TOKEN_ID);
        });

        it(`should fail if the token is reserved by an auction`, async () => {
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
                permitSigner: artTokenSigner,
                sender: institution,
            });

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

            const tx = ArtTokenUtils.mint({
                artToken,
                permit: tokenMintingPermit,
                permitSigner: artTokenSigner,
                sender: buyer,
            });

            await expect(tx).to.be.rejectedWith('ArtTokenTokenReserved');
        });

        it(`should fail if the permit signer is not the art token signer`, async () => {
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

            const tx = ArtTokenUtils.mint({
                artToken,
                permit: tokenMintingPermit,
                permitSigner: randomAccount, // Wrong signer
                sender: buyer,
            });

            await expect(tx).to.be.rejectedWith('AuthorizationUnauthorizedAction');
        });
    });

    describe(`method 'transferFrom'`, () => {
        beforeEach(async () => {
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

            await usdc.connect(buyer).mintAndApprove(artToken, MaxInt256);

            await ArtTokenUtils.mint({
                artToken,
                permit: tokenMintingPermit,
                permitSigner: artTokenSigner,
                sender: buyer,
            });
        });

        /**
         * case 1: RegulationMode.Regulated or RegulationMode.None
         *  - should transfer to a non-contract account
         *  - should transfer to a partner contract
         *  - should fail if a token is transferred to a non-partner contract
         * case 2: RegulationMode.Unregulated
         *  - should transfer to a non-contract account
         *  - should transfer to a partner contract
         *  - should transfer to a non-partner contract
         */

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

            await expect(tx).eventually.rejectedWith('ArtTokenUnauthorizedAccount');
        });
    });

    describe(`method 'approve'`, () => {
        beforeEach(async () => {
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

            await usdc.connect(buyer).mintAndApprove(artToken, MaxInt256);

            await ArtTokenUtils.mint({
                artToken,
                permit: tokenMintingPermit,
                permitSigner: artTokenSigner,
                sender: buyer,
            });
        });

        /**
         * case 1: RegulationMode.Regulated or RegulationMode.None
         *  - should provide the approval to a non-contract account
         *  - should provide the approval to a partner contract
         *  - should fail if the approval is provided to a non-partner contract
         *  - should fail if a token is transferred by a non-partner contract with approval
         * case 2: RegulationMode.Unregulated
         *  - should provide the approval to a non-contract account
         *  - should provide the approval to a partner contract
         *  - should provide the approval to a non-partner contract
         */

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

            await expect(tx).eventually.rejectedWith('ArtTokenUnauthorizedAccount');
        });
    });

    describe(`method 'setApprovalForAll'`, () => {
        beforeEach(async () => {
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

            await usdc.connect(buyer).mintAndApprove(artToken, MaxInt256);

            await ArtTokenUtils.mint({
                artToken,
                permit: tokenMintingPermit,
                permitSigner: artTokenSigner,
                sender: buyer,
            });
        });

        /**
         * case 1: RegulationMode.Regulated or RegulationMode.None
         *  - should provide the approval to a non-contract account
         *  - should provide the approval to a partner contract
         *  - should fail if the approval is provided to a non-partner contract
         *  - should fail if a token is transferred by a non-partner contract with approval
         * case 2: RegulationMode.Unregulated
         *  - should provide the approval to a non-contract account
         *  - should provide the approval to a partner contract
         *  - should provide the approval to a non-partner contract
         */

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

            await expect(tx).eventually.rejectedWith('ArtTokenUnauthorizedAccount');
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
