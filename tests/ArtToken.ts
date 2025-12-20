import { expect } from 'chai';
import { Signer, MaxInt256, ZeroAddress } from 'ethers';
import { ArtToken, AuctionHouse, USDC, Market } from '../typechain-types';
import { AuctionCreationPermit } from '../typechain-types/contracts/auction-house/AuctionHouse';
import { TokenMintingPermit } from '../typechain-types/contracts/art-token/ArtToken';
import { HOUR, ONE_HUNDRED } from './constants/general';
import {
    NON_EXISTENT_TOKEN_ID,
    SECOND_TOKEN_URI,
    TOKEN_CONFIG,
    TOKEN_CREATOR_ADDR,
    TOKEN_FEE,
    TOKEN_ID,
    TOKEN_PRICE,
    TOKEN_ROYALTY_PERCENT,
    TOKEN_URI,
} from './constants/art-token';
import { AUCTION_FEE, AUCTION_ID, AUCTION_PRICE, AUCTION_STEP } from './constants/auction-house';
import {
    REGULATION_MODE_NONE,
    REGULATION_MODE_REGULATED,
    REGULATION_MODE_UNREGULATED,
} from './constants/token-config';
import { getSigners } from './utils/get-signers';
import { getLatestBlockTimestamp } from './utils/get-latest-block-timestamp';
import { deployAll } from './utils/deploy-all';
import { ArtTokenUtils } from './utils/art-token-utils';
import { AuctionHouseUtils } from './utils/auction-house-utils';

describe('ArtToken', function () {
    /**
     * TODO:
     *
     * > ArtTokenConfigManager:
     *  > `updateTokenCreator` method:
     *    - should update the token creator
     *    - should fail if the caller is not the art token admin
     *
     *  > `updateTokenRegulationMode` method:
     *    - should update the token regulation mode
     *    - should fail if the caller is not the art token admin
     *
     *  > `tokenCreator` method:
     *  - should return correct token-specific creator address
     *
     *  > `tokenRegulationMode` method:
     *  - should return correct token-specific regulation mode
     *
     */
    let artToken: ArtToken, artTokenAddr: string;
    let auctionHouse: AuctionHouse, auctionHouseAddr: string;
    let market: Market, marketAddr: string;
    let usdc: USDC, usdcAddr: string;

    let artTokenSigner: Signer, artTokenSignerAddr: string;
    let financier: Signer, financierAddr: string;
    let admin: Signer, adminAddr: string;
    let institution: Signer, institutionAddr: string;
    let buyer: Signer, buyerAddr: string;
    let randomAccount: Signer, randomAccountAddr: string;

    before(async () => {
        [
            [artTokenSigner, financier, admin, institution, buyer, randomAccount],
            [
                artTokenSignerAddr,
                financierAddr,
                adminAddr,
                institutionAddr,
                buyerAddr,
                randomAccountAddr,
            ],
        ] = await getSigners();
    });

    beforeEach(async () => {
        const all = await deployAll({ signer: artTokenSigner, financier, admin });

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
                .emit(usdc, 'Transfer')
                .withArgs(buyerAddr, artTokenAddr, TOKEN_PRICE + TOKEN_FEE);

            await expect(tx)
                .emit(usdc, 'Transfer')
                .withArgs(artTokenAddr, institutionAddr, institutionReward);

            await expect(tx)
                .emit(usdc, 'Transfer')
                .withArgs(artTokenAddr, financierAddr, platformReward);

            await expect(tx)
                .emit(usdc, 'Transfer')
                .withArgs(artTokenAddr, financierAddr, TOKEN_FEE);

            await expect(tx) //
                .emit(artToken, 'Transfer')
                .withArgs(ZeroAddress, buyerAddr, TOKEN_ID);
        });

        it(`should set correct token config`, async () => {
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

            await ArtTokenUtils.mint({
                artToken,
                permit: tokenMintingPermit,
                permitSigner: artTokenSigner,
                sender: buyer,
            });

            const tokenCreator = await artToken.tokenCreator(TOKEN_ID);
            const tokenRegulationMode = await artToken.tokenRegulationMode(TOKEN_ID);

            expect(tokenCreator).equal(TOKEN_CONFIG.creator);
            expect(tokenRegulationMode).equal(TOKEN_CONFIG.regulationMode);
        });

        it(`should fail if the caller is not the allowed minter`, async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();

            const tokenMintingPermit: TokenMintingPermit.TypeStruct = {
                tokenId: TOKEN_ID,
                minter: buyerAddr, // Not allowed minter
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
                sender: randomAccount,
            });

            await expect(tx).rejectedWith('ArtTokenUnauthorizedAccount');
        });

        it(`should fail if the currency is not allowed`, async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();

            const tokenMintingPermit: TokenMintingPermit.TypeStruct = {
                tokenId: TOKEN_ID,
                minter: buyerAddr,
                currency: randomAccountAddr, // Not allowed currency
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

            await expect(tx).rejectedWith('ArtTokenCurrencyInvalid');
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

            await expect(tx).rejectedWith('ArtTokenTokenReserved');
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

            await expect(tx).rejectedWith('AuthorizationUnauthorizedAction');
        });
    });

    describe(`method 'mintFromAuctionHouse'`, () => {
        it(`should fail if the caller is not the auction house`, async () => {
            const tx = artToken
                .connect(randomAccount)
                .mintFromAuctionHouse(randomAccountAddr, TOKEN_ID, TOKEN_URI, TOKEN_CONFIG);

            await expect(tx).rejectedWith('ArtTokenUnauthorizedAccount');
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

        for (const regulationMode of [
            REGULATION_MODE_NONE,
            REGULATION_MODE_UNREGULATED,
            REGULATION_MODE_REGULATED,
        ]) {
            describe(`Regulation mode is '${regulationMode}'`, () => {
                beforeEach(async () => {
                    await artToken
                        .connect(admin)
                        .updateTokenRegulationMode(TOKEN_ID, regulationMode);
                });

                it(`should transfer to a non-contract account`, async () => {
                    const tx = await artToken
                        .connect(buyer)
                        .transferFrom(buyer, randomAccount, TOKEN_ID);

                    await expect(tx)
                        .emit(artToken, 'Transfer')
                        .withArgs(buyerAddr, randomAccountAddr, TOKEN_ID);
                });

                it(`should transfer to a partner contract`, async () => {
                    const tx = await artToken.connect(buyer).transferFrom(buyer, market, TOKEN_ID);

                    await expect(tx)
                        .emit(artToken, 'Transfer')
                        .withArgs(buyerAddr, marketAddr, TOKEN_ID);
                });

                if ([REGULATION_MODE_NONE, REGULATION_MODE_REGULATED].includes(regulationMode)) {
                    it(`should fail if a token is transferred to a non-partner contract`, async () => {
                        const tx = artToken.connect(buyer).transferFrom(buyer, usdc, TOKEN_ID);

                        await expect(tx).rejectedWith('ArtTokenUnauthorizedAccount');
                    });
                }

                if ([REGULATION_MODE_UNREGULATED].includes(regulationMode)) {
                    it(`should transfer to a non-partner contract`, async () => {
                        const tx = await artToken
                            .connect(buyer)
                            .transferFrom(buyer, usdc, TOKEN_ID);

                        await expect(tx)
                            .emit(artToken, 'Transfer')
                            .withArgs(buyerAddr, usdcAddr, TOKEN_ID);
                    });
                }
            });
        }
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

        for (const regulationMode of [
            REGULATION_MODE_NONE,
            REGULATION_MODE_UNREGULATED,
            REGULATION_MODE_REGULATED,
        ]) {
            describe(`Regulation mode is '${regulationMode}'`, () => {
                beforeEach(async () => {
                    await artToken
                        .connect(admin)
                        .updateTokenRegulationMode(TOKEN_ID, regulationMode);
                });

                it(`should provide the approval to a non-contract account`, async () => {
                    const tx = await artToken.connect(buyer).approve(randomAccountAddr, TOKEN_ID);

                    await expect(tx)
                        .emit(artToken, 'Approval')
                        .withArgs(buyerAddr, randomAccountAddr, TOKEN_ID);
                });

                it(`should provide the approval to a partner contract`, async () => {
                    const tx = await artToken.connect(buyer).approve(market, TOKEN_ID);

                    await expect(tx)
                        .emit(artToken, 'Approval')
                        .withArgs(buyerAddr, marketAddr, TOKEN_ID);
                });

                if ([REGULATION_MODE_NONE, REGULATION_MODE_REGULATED].includes(regulationMode)) {
                    it(`should fail if approval is provided to a non-partner contract`, async () => {
                        const tx = artToken.connect(buyer).approve(usdc, TOKEN_ID);

                        await expect(tx).rejectedWith('ArtTokenUnauthorizedAccount');
                    });

                    it(
                        `should fail if a token is transferred by a non-partner contract with approval`,
                    );
                }

                if ([REGULATION_MODE_UNREGULATED].includes(regulationMode)) {
                    it(`should provide the approval to a non-partner contract`, async () => {
                        const tx = await artToken.connect(buyer).approve(usdc, TOKEN_ID);

                        await expect(tx)
                            .emit(artToken, 'Approval')
                            .withArgs(buyerAddr, usdc, TOKEN_ID);
                    });
                }
            });
        }
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

        for (const regulationMode of [
            REGULATION_MODE_NONE,
            REGULATION_MODE_UNREGULATED,
            REGULATION_MODE_REGULATED,
        ]) {
            describe(`Regulation mode is '${regulationMode}'`, () => {
                beforeEach(async () => {
                    await artToken
                        .connect(admin)
                        .updateTokenRegulationMode(TOKEN_ID, regulationMode);
                });

                it(`should provide the approval to a non-contract account`, async () => {
                    const tx = await artToken
                        .connect(buyer)
                        .setApprovalForAll(randomAccountAddr, true);

                    await expect(tx)
                        .emit(artToken, 'ApprovalForAll')
                        .withArgs(buyerAddr, randomAccountAddr, true);
                });

                it(`should provide the approval to a partner contract`, async () => {
                    const tx = await artToken.connect(buyer).setApprovalForAll(market, true);

                    await expect(tx)
                        .emit(artToken, 'ApprovalForAll')
                        .withArgs(buyerAddr, marketAddr, true);
                });

                it(`should fail if approval is provided to a non-partner contract`, async () => {
                    const tx = artToken.connect(buyer).setApprovalForAll(usdc, true);

                    await expect(tx).rejectedWith('ArtTokenUnauthorizedAccount');
                });

                if ([REGULATION_MODE_NONE, REGULATION_MODE_REGULATED].includes(regulationMode)) {
                    it(
                        `should fail if a token is transferred by a non-partner contract with approval`,
                    );
                }
            });
        }
    });

    describe(`method 'royaltyInfo'`, () => {
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

        it(`should return correct receiver address`, async () => {
            const [receiver] = await artToken.royaltyInfo(TOKEN_ID, TOKEN_PRICE);

            expect(receiver).equal(TOKEN_CREATOR_ADDR);
        });

        it(`should return correct default receiver address`, async () => {
            await artToken.connect(admin).updateTokenCreator(TOKEN_ID, ZeroAddress);

            const [receiver] = await artToken.royaltyInfo(TOKEN_ID, TOKEN_PRICE);

            expect(receiver).equal(financierAddr);
        });

        it(`should return correct royalty amount`, async () => {
            const [_, royaltyAmount] = await artToken.royaltyInfo(TOKEN_ID, TOKEN_PRICE);

            expect(royaltyAmount).equal((TOKEN_PRICE * TOKEN_ROYALTY_PERCENT) / ONE_HUNDRED);
        });
    });

    describe(`method 'setTokenURI'`, () => {
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

        it(`should set the new token URI`, async () => {
            const tx = await artToken.connect(admin).setTokenURI(TOKEN_ID, SECOND_TOKEN_URI);

            await expect(tx).emit(artToken, 'MetadataUpdate').withArgs(TOKEN_ID);

            const tokenURI = await artToken.tokenURI(TOKEN_ID);

            expect(tokenURI).equal(SECOND_TOKEN_URI);
        });

        it(`should fail if the caller is not the art token admin`, async () => {
            const tx = artToken.connect(randomAccount).setTokenURI(TOKEN_ID, SECOND_TOKEN_URI);

            await expect(tx).rejectedWith('RoleSystemUnauthorizedAccount');
        });

        it(`should fail if the token does not exist`, async () => {
            const tx = artToken.connect(admin).setTokenURI(NON_EXISTENT_TOKEN_ID, SECOND_TOKEN_URI);

            await expect(tx).rejectedWith('ArtTokenNonexistentToken');
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
