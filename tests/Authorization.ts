import { expect } from 'chai';
import { Signer, MaxInt256 } from 'ethers';
import { ArtToken, USDC } from '../typechain-types';
import { HOUR } from './constants/general';
import { TOKEN_CONFIG, TOKEN_FEE, TOKEN_ID, TOKEN_PRICE, TOKEN_URI } from './constants/art-token';
import { getSigners } from './utils/get-signers';
import { getLatestBlockTimestamp } from './utils/get-latest-block-timestamp';
import { deployAll } from './utils/deploy-all';
import { ArtTokenUtils } from './utils/art-token-utils';
import { TokenMintingPermit } from '../typechain-types/contracts/art-token/ArtToken';

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
        const all = await deployAll({
            signer: artTokenSigner,
            financier,
        });

        artToken = all.artToken;
        artTokenAddr = all.artTokenAddr;
        usdc = all.usdc;
        usdcAddr = all.usdcAddr;
    });

    describe(`method '_requireAuthorizedAction'`, () => {
        beforeEach(async () => {
            await usdc.connect(buyer).mintAndApprove(artToken, MaxInt256);
        });

        it(`should allow the action`, async () => {
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
        });

        it(`should fail the action if the deadline has expired`, async () => {
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
                deadline: latestBlockTimestamp - HOUR, // Wrong deadline
            };

            const tx = ArtTokenUtils.mint({
                artToken,
                permit: tokenMintingPermit,
                permitSigner: artTokenSigner,
                sender: buyer,
            });

            await expect(tx).rejectedWith('AuthorizationDeadlineExpired');
        });

        it(`should fail if the signer is invalid`, async () => {
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
});
