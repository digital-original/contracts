import { expect } from 'chai';
import { MarketMock, TransferChecker } from '../typechain-types';
import { deployClassic } from '../scripts/deploy-classic';

describe('TransferChecker', function () {
    let transferChecker: TransferChecker;
    let trustedMarket: MarketMock;
    let trustedAuction: MarketMock;
    let randomMarket: MarketMock;

    before(async () => {
        const _trustedMarket = await deployClassic({
            contractName: 'MarketMock',
            constructorArgs: [],
        });

        const _trustedAuction = await deployClassic({
            contractName: 'MarketMock',
            constructorArgs: [],
        });

        const _randomMarket = await deployClassic({
            contractName: 'MarketMock',
            constructorArgs: [],
        });

        const _transferChecker = await deployClassic({
            contractName: 'TransferChecker',
            constructorArgs: [_trustedMarket.address, _trustedAuction.address],
        });

        transferChecker = <TransferChecker>_transferChecker;
        trustedMarket = <MarketMock>_trustedMarket;
        trustedAuction = <MarketMock>_trustedAuction;
        randomMarket = <MarketMock>_randomMarket;
    });

    it(`should have correct market`, async () => {
        await expect(transferChecker.market()).to.eventually.equal(trustedMarket.address);
    });

    it(`should have correct auction`, async () => {
        await expect(transferChecker.auction()).to.eventually.equal(trustedAuction.address);
    });

    describe(`method 'check'`, () => {
        const from = '0x0000000000000000000000000000000000000010';
        const toEOA = '0x0000000000000000000000000000000000000020';
        const tokeId = 1;

        it(`should pass if address 'to' isn't a contract`, async () => {
            await expect(transferChecker.check(from, toEOA, tokeId)).to.fulfilled;
        });

        it(`should pass if address 'to' is a trusted contract`, async () => {
            await Promise.all([
                expect(transferChecker.check(from, trustedMarket.address, tokeId)).to.fulfilled,
                expect(transferChecker.check(from, trustedAuction.address, tokeId)).to.fulfilled,
            ]);
        });

        it(`should fail if address 'to' isn't a trusted contract`, async () => {
            await expect(transferChecker.check(from, randomMarket.address, tokeId)).to.rejectedWith(
                'TransferChecker: not trusted receiver'
            );
        });
    });
});
