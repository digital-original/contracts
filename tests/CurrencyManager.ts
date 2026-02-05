import { expect } from 'chai';
import { Signer, ZeroAddress } from 'ethers';
import { CurrencyManager, USDC } from '../typechain-types';
import { getSigners } from './utils/get-signers';
import { deployAll } from './utils/deploy-all';

describe('CurrencyManager', function () {
    let currencyManager: CurrencyManager, currencyManagerAddr: string;
    let usdc: USDC, usdcAddr: string;

    let admin: Signer, adminAddr: string;
    let signer: Signer, signerAddr: string;
    let financier: Signer, financierAddr: string;
    let randomAccount: Signer, randomAccountAddr: string;

    before(async () => {
        [
            [signer, financier, admin, randomAccount],
            [signerAddr, financierAddr, adminAddr, randomAccountAddr],
        ] = await getSigners();
    });

    beforeEach(async () => {
        const all = await deployAll({
            signer,
            financier,
            admin,
        });

        currencyManager = all.market;
        currencyManagerAddr = all.marketAddr;
        usdc = all.usdc;
        usdcAddr = all.usdcAddr;
    });

    describe(`method 'currencyAllowed'`, () => {
        it(`should return true if the currency is allowed`, async () => {
            const currencyAllowed = await currencyManager.currencyAllowed(usdcAddr);

            expect(currencyAllowed).equal(true);
        });

        it(`should return false if the currency is not allowed`, async () => {
            const currencyAllowed = await currencyManager.currencyAllowed(ZeroAddress);

            expect(currencyAllowed).equal(false);
        });
    });

    describe(`method 'updateCurrencyStatus'`, () => {
        it(`should update the currency status if the caller is an admin`, async () => {
            const currencyAllowedBefore = await currencyManager.currencyAllowed(usdcAddr);

            expect(currencyAllowedBefore).equal(true);

            const tx = await currencyManager.connect(admin).updateCurrencyStatus(usdcAddr, false);

            const currencyAllowedAfter = await currencyManager.currencyAllowed(usdcAddr);

            expect(currencyAllowedAfter).equal(false);

            await expect(tx)
                .emit(currencyManager, 'CurrencyStatusUpdated')
                .withArgs(usdcAddr, false);
        });

        it(`should fail if the caller is not an admin`, async () => {
            const tx = currencyManager.connect(randomAccount).updateCurrencyStatus(usdcAddr, false);

            await expect(tx).rejectedWith('RoleSystemUnauthorizedAccount');
        });
    });
});
