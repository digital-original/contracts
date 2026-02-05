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
import { deployProtocolTest } from './utils/deploy-protocol-test';
import { ArtTokenUtils } from './utils/art-token-utils';

describe('Authorization', function () {
    let artToken: ArtToken, artTokenAddr: string;
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
        const protocol = await deployProtocolTest({
            signer: artTokenSigner,
            financier,
        });

        artToken = protocol.artToken;
        artTokenAddr = protocol.artTokenAddr;
        usdc = protocol.usdc;
        usdcAddr = protocol.usdcAddr;
    });

    describe(`method '_requireAuthorizedAction'`, () => {
        beforeEach(async () => {
            await usdc.connect(buyer).mintAndApprove(artToken, MaxInt256);
        });

        it(`should allow the action`, async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();
            const deadline = latestBlockTimestamp + HOUR;

            const buyPermit: BuyPermitStruct = {
                tokenId: TOKEN_ID,
                tokenURI: TOKEN_URI,
                sender: buyerAddr,
                price: MIN_PRICE,
                fee: MIN_FEE,
                participants: [institutionAddr],
                shares: [TOTAL_SHARE],
                deadline,
            };

            await ArtTokenUtils.buy({
                artToken,
                permit: buyPermit,
                permitSigner: artTokenSigner,
                sender: buyer,
            });
        });

        it(`should fail the action if the deadline has expired`, async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();
            const deadline = latestBlockTimestamp - HOUR;

            const buyPermit: BuyPermitStruct = {
                tokenId: TOKEN_ID,
                tokenURI: TOKEN_URI,
                sender: buyerAddr,
                price: MIN_PRICE,
                fee: MIN_FEE,
                participants: [institutionAddr],
                shares: [TOTAL_SHARE],
                deadline,
            };

            const tx = ArtTokenUtils.buy({
                artToken,
                permit: buyPermit,
                permitSigner: artTokenSigner,
                sender: buyer,
            });

            await expect(tx).to.be.rejectedWith('AuthorizationDeadlineExpired');
        });

        it(`should fail if the signer is invalid`, async () => {
            const latestBlockTimestamp = await getLatestBlockTimestamp();
            const deadline = latestBlockTimestamp + HOUR;

            const buyPermit: BuyPermitStruct = {
                tokenId: TOKEN_ID,
                tokenURI: TOKEN_URI,
                sender: buyerAddr,
                price: MIN_PRICE,
                fee: MIN_FEE,
                participants: [institutionAddr],
                shares: [TOTAL_SHARE],
                deadline,
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
});
