import { expect } from 'chai';
import { ethers } from 'hardhat';
import { getSigners } from './utils/get-signers';
import { ArtToken } from '../typechain-types';
import { Signer } from '../types/environment';
import { deployProtocol } from '../scripts/deploy-protocol';

describe('RoleSystem', function () {
    let roleSystem: ArtToken, roleSystemAddr: string;

    let main: Signer, mainAddr: string;
    let account: Signer, accountAddr: string;

    const someRole = ethers.keccak256(Buffer.from('SOME_ROLE'));

    before(async () => {
        [[main, account], [mainAddr, accountAddr]] = await getSigners();
    });

    beforeEach(async () => {
        const { artToken: _artToken, artTokenAddr: _artTokenAddr } = await deployProtocol({
            name: 'TestToken',
            symbol: 'TT',
            main,
            usdc: '0xffffffffffffffffffffffffffffffffffffffff',
            minPriceUsd: 10,
            minFeeUsd: 10,
            minAuctionDurationHours: 1,
            regulated: true,
        });

        roleSystem = _artToken.connect(main);
        roleSystemAddr = _artTokenAddr;
    });

    describe(`roles`, () => {
        describe(`method 'grandRole'`, () => {
            it(`should grand`, async () => {
                const transaction = await roleSystem.grandRole(someRole, account);

                await Promise.all([
                    expect(transaction)
                        .to.be.emit(roleSystem, 'RoleGranted')
                        .withArgs(someRole, accountAddr),
                    expect(roleSystem.hasRole(someRole, account)).to.eventually.equal(true),
                ]);
            });

            it(`should fail if sender is not main`, async () => {
                await expect(
                    roleSystem.connect(account).grandRole(someRole, account),
                ).to.eventually.rejectedWith('RoleSystemNotMain');
            });
        });

        describe(`method 'revokeRole'`, () => {
            beforeEach(async () => {
                await roleSystem.grandRole(someRole, account);
            });

            it(`should revoke`, async () => {
                const transaction = await roleSystem.revokeRole(someRole, account);

                await Promise.all([
                    expect(transaction)
                        .to.be.emit(roleSystem, 'RoleRevoked')
                        .withArgs(someRole, accountAddr),
                    expect(roleSystem.hasRole(someRole, account)).to.eventually.equal(false),
                ]);
            });

            it(`should fail if sender is not main`, async () => {
                await expect(
                    roleSystem.connect(account).revokeRole(someRole, account),
                ).to.eventually.rejectedWith('RoleSystemNotMain');
            });
        });

        describe(`method 'hasRole'`, () => {
            it(`should work correctly`, async () => {
                await roleSystem.grandRole(someRole, account);

                await expect(roleSystem.hasRole(someRole, account)).to.eventually.equal(true);

                await roleSystem.revokeRole(someRole, account);

                await expect(roleSystem.hasRole(someRole, account)).to.eventually.equal(false);
            });

            it(`should fail if account is null`, async () => {
                await expect(
                    roleSystem.hasRole(someRole, ethers.ZeroAddress),
                ).to.eventually.rejectedWith('RoleSystemZeroAddress');
            });
        });
    });

    describe(`unique roles`, () => {
        describe(`method 'transferUniqueRole'`, () => {
            it(`should transfer`, async () => {
                const transaction1 = await roleSystem.transferUniqueRole(someRole, account);

                await expect(transaction1)
                    .to.be.emit(roleSystem, 'UniqueRoleTransferred')
                    .withArgs(ethers.ZeroAddress, accountAddr, someRole);

                const transaction2 = await roleSystem.transferUniqueRole(
                    someRole,
                    ethers.ZeroAddress,
                );

                await expect(transaction2)
                    .to.be.emit(roleSystem, 'UniqueRoleTransferred')
                    .withArgs(accountAddr, ethers.ZeroAddress, someRole);
            });

            it(`should fail if sender is not main`, async () => {
                await expect(
                    roleSystem.connect(account).transferUniqueRole(someRole, account),
                ).to.eventually.rejectedWith('RoleSystemNotMain');
            });
        });

        describe(`method 'uniqueRoleAccount'`, () => {
            it(`should return account`, async () => {
                await roleSystem.transferUniqueRole(someRole, account);

                await expect(roleSystem.uniqueRoleAccount(someRole)).to.eventually.equal(
                    accountAddr,
                );
            });

            it(`should fail if account is null`, async () => {
                await expect(roleSystem.uniqueRoleAccount(someRole)).to.eventually.rejectedWith(
                    'RoleSystemZeroAddress',
                );
            });
        });
    });
});
