import { expect } from 'chai';
import { Signer, MaxInt256 } from 'ethers';
import { ArtToken, USDC } from '../typechain-types';
import { BuyPermitStruct } from '../types/art-token';
import { MIN_FEE, MIN_PRICE } from './constants/min-price-and-fee';
import { TOTAL_SHARE } from './constants/distribution';
import { TOKEN_ID, TOKEN_URI } from './constants/art-token';
import { HOUR } from './constants/time';
import { getSigners } from './utils/get-signers';
import { getLatestBlockTimestamp } from './utils/get-latest-block-timestamp';
import { deployAll } from './utils/deploy-all';
import { ArtTokenUtils } from './utils/art-token-utils';

describe('Distribution', function () {
    let artToken: ArtToken, artTokenAddr: string;
    let usdc: USDC, usdcAddr: string;

    let artTokenSigner: Signer, artTokenSignerAddr: string;
    let financier: Signer, financierAddr: string;
    let institution: Signer, institutionAddr: string;
    let buyer: Signer, buyerAddr: string;

    before(async () => {
        [
            [artTokenSigner, financier, institution, buyer],
            [artTokenSignerAddr, financierAddr, institutionAddr, buyerAddr],
        ] = await getSigners();
    });

    beforeEach(async () => {
        const all = await deployAll({
            signer: artTokenSigner,
            financier,
        });

        artToken = all.artToken;
        artTokenAddr = all.artTokenAddr;
        usdc = all.usdc;
        usdcAddr = all.usdcAddr;
    });

    describe(`method 'safeDistribute'`, () => {
        beforeEach(async () => {
            await usdc.connect(buyer).mintAndApprove(artToken, MaxInt256);
        });

        it(`should distribute rewards among participants according to shares`, async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();

            const institutionShare = (TOTAL_SHARE / 5n) * 4n; // 80%
            const platformShare = TOTAL_SHARE / 5n; // 20%

            const price = MIN_PRICE;

            const buyPermit: BuyPermitStruct = {
                tokenId: TOKEN_ID,
                tokenURI: TOKEN_URI,
                sender: buyerAddr,
                price,
                fee: MIN_FEE,
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
                .withArgs(artTokenAddr, institutionAddr, (price * institutionShare) / TOTAL_SHARE);

            await expect(tx)
                .to.be.emit(usdc, 'Transfer')
                .withArgs(artTokenAddr, financierAddr, (price * platformShare) / TOTAL_SHARE);
        });

        it(`should send the remainder of the division to the last participant`, async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();

            const institutionShare = (TOTAL_SHARE / 5n) * 4n; // 80%
            const platformShare = TOTAL_SHARE / 5n; // 20%

            const remainder = 1n;
            const price = 100_000_000n + remainder;

            const buyPermit: BuyPermitStruct = {
                tokenId: TOKEN_ID,
                tokenURI: TOKEN_URI,
                sender: buyerAddr,
                price,
                fee: MIN_FEE,
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
                .withArgs(artTokenAddr, institutionAddr, (price * institutionShare) / TOTAL_SHARE);

            await expect(tx)
                .to.be.emit(usdc, 'Transfer')
                .withArgs(
                    artTokenAddr,
                    financierAddr,
                    (price * platformShare) / TOTAL_SHARE + remainder,
                );
        });

        it(`should fail if the number of participants and the number of shares do not match`, async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();

            const institutionShare = TOTAL_SHARE;

            const price = MIN_PRICE;

            const buyPermit: BuyPermitStruct = {
                tokenId: TOKEN_ID,
                tokenURI: TOKEN_URI,
                sender: buyerAddr,
                price,
                fee: MIN_FEE,
                participants: [institutionAddr, financierAddr],
                shares: [institutionShare],
                deadline: latestBlockTimestamp + HOUR,
            };

            const tx = ArtTokenUtils.buy({
                artToken,
                permit: buyPermit,
                permitSigner: artTokenSigner,
                sender: buyer,
            });

            await expect(tx).to.be.rejectedWith('DistributionParticipantsSharesMismatch');
        });

        it(`should fail if the total share is greater than 100%`, async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();

            const institutionShare = (TOTAL_SHARE / 5n) * 4n; // 80%
            const platformShare = TOTAL_SHARE / 4n; // 25%

            const price = MIN_PRICE;

            const buyPermit: BuyPermitStruct = {
                tokenId: TOKEN_ID,
                tokenURI: TOKEN_URI,
                sender: buyerAddr,
                price,
                fee: MIN_FEE,
                participants: [institutionAddr, financierAddr],
                shares: [institutionShare, platformShare],
                deadline: latestBlockTimestamp + HOUR,
            };

            const tx = ArtTokenUtils.buy({
                artToken,
                permit: buyPermit,
                permitSigner: artTokenSigner,
                sender: buyer,
            });

            await expect(tx).to.be.rejectedWith('DistributionSharesSumTooBig(10500)');
        });

        it(`should fail if the total share is less than 100%`, async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();

            const institutionShare = (TOTAL_SHARE / 5n) * 3n; // 60%
            const platformShare = TOTAL_SHARE / 5n; // 20%

            const price = MIN_PRICE;

            const buyPermit: BuyPermitStruct = {
                tokenId: TOKEN_ID,
                tokenURI: TOKEN_URI,
                sender: buyerAddr,
                price,
                fee: MIN_FEE,
                participants: [institutionAddr, financierAddr],
                shares: [institutionShare, platformShare],
                deadline: latestBlockTimestamp + HOUR,
            };

            const tx = ArtTokenUtils.buy({
                artToken,
                permit: buyPermit,
                permitSigner: artTokenSigner,
                sender: buyer,
            });

            await expect(tx).to.be.rejectedWith('DistributionSharesSumTooLow(8000)');
        });

        it(`should fail if shares and participants are missing`, async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();

            const price = MIN_PRICE;

            const buyPermit: BuyPermitStruct = {
                tokenId: TOKEN_ID,
                tokenURI: TOKEN_URI,
                sender: buyerAddr,
                price,
                fee: MIN_FEE,
                participants: [],
                shares: [],
                deadline: latestBlockTimestamp + HOUR,
            };

            const tx = ArtTokenUtils.buy({
                artToken,
                permit: buyPermit,
                permitSigner: artTokenSigner,
                sender: buyer,
            });

            await expect(tx).to.be.rejectedWith('DistributionSharesSumTooLow(0)');
        });
    });
});
