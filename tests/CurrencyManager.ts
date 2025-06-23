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
            expect(await currencyManager.currencyAllowed(usdcAddr)).to.be.true;
        });

        it(`should return false if the currency is not allowed`, async () => {
            expect(await currencyManager.currencyAllowed(ZeroAddress)).to.be.false;
        });
    });

    describe(`method 'updateCurrencyStatus'`, () => {
        it(`should update the currency status if the caller is admin`, async () => {
            expect(await currencyManager.currencyAllowed(usdcAddr)).to.be.true;

            await expect(currencyManager.connect(admin).updateCurrencyStatus(usdcAddr, false))
                .to.emit(currencyManager, 'CurrencyStatusUpdated')
                .withArgs(usdcAddr, false);

            expect(await currencyManager.currencyAllowed(usdcAddr)).to.be.false;

            await expect(currencyManager.connect(admin).updateCurrencyStatus(usdcAddr, true))
                .to.emit(currencyManager, 'CurrencyStatusUpdated')
                .withArgs(usdcAddr, true);

            expect(await currencyManager.currencyAllowed(usdcAddr)).to.be.true;
        });

        it(`should fail if the caller is not admin`, async () => {
            await expect(
                currencyManager.connect(randomAccount).updateCurrencyStatus(usdcAddr, false),
            ).to.be.revertedWithCustomError(currencyManager, 'RoleSystemUnauthorizedAccount');
        });
    });
});
