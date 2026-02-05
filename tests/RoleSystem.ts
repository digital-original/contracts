import { expect } from 'chai';
import { Signer, ZeroAddress } from 'ethers';
import { ethers } from 'hardhat';
import { deploy } from '../scripts/deploy';
import { RoleSystem } from '../typechain-types';
import { ADMIN_ROLE } from './constants/roles';
import { getSigners } from './utils/get-signers';

describe('RoleSystem', function () {
    let roleSystem: RoleSystem, roleSystemAddr: string;

    let main: Signer, mainAddr: string;
    let account: Signer, accountAddr: string;

    before(async () => {
        [[main, account], [mainAddr, accountAddr]] = await getSigners();
    });

    beforeEach(async () => {
        const { contractAddr } = await deploy({
            name: 'RoleSystem',
            constructorArgs: [main],
        });

        roleSystem = await ethers.getContractAt('RoleSystem', contractAddr, main);
        roleSystemAddr = contractAddr;
    });

    describe(`roles`, () => {
        describe(`method 'grantRole'`, () => {
            it(`should grant a role`, async () => {
                const tx = await roleSystem.grantRole(ADMIN_ROLE, account);

                const hasRole = await roleSystem.hasRole(ADMIN_ROLE, account);

                expect(hasRole).equal(true);

                await expect(tx) //
                    .emit(roleSystem, 'RoleGranted')
                    .withArgs(ADMIN_ROLE, accountAddr);
            });

            it(`should fail if the sender is not the main account`, async () => {
                const tx = roleSystem.connect(account).grantRole(ADMIN_ROLE, account);

                await expect(tx).rejectedWith('RoleSystemNotMain');
            });
        });

        describe(`method 'revokeRole'`, () => {
            beforeEach(async () => {
                await roleSystem.grantRole(ADMIN_ROLE, account);
            });

            it(`should revoke a role`, async () => {
                const tx = await roleSystem.revokeRole(ADMIN_ROLE, account);

                const hasRole = await roleSystem.hasRole(ADMIN_ROLE, account);

                expect(hasRole).equal(false);

                await expect(tx) //
                    .emit(roleSystem, 'RoleRevoked')
                    .withArgs(ADMIN_ROLE, accountAddr);
            });

            it(`should fail if the sender is not the main account`, async () => {
                const tx = roleSystem.connect(account).revokeRole(ADMIN_ROLE, account);

                await expect(tx).rejectedWith('RoleSystemNotMain');
            });
        });

        describe(`method 'hasRole'`, () => {
            it(`should return the correct value`, async () => {
                await roleSystem.grantRole(ADMIN_ROLE, account);

                const hasRoleAfterGrant = await roleSystem.hasRole(ADMIN_ROLE, account);

                expect(hasRoleAfterGrant).equal(true);

                await roleSystem.revokeRole(ADMIN_ROLE, account);

                const hasRoleAfterRevoke = await roleSystem.hasRole(ADMIN_ROLE, account);

                expect(hasRoleAfterRevoke).equal(false);
            });

            it(`should fail if the account is the zero address`, async () => {
                const hasRole = roleSystem.hasRole(ADMIN_ROLE, ZeroAddress);

                await expect(hasRole).rejectedWith('RoleSystemZeroAddress');
            });
        });
    });

    describe(`unique roles`, () => {
        describe(`method 'transferUniqueRole'`, () => {
            it(`should transfer a unique role`, async () => {
                const tx1 = await roleSystem.transferUniqueRole(ADMIN_ROLE, account);

                await expect(tx1)
                    .emit(roleSystem, 'UniqueRoleTransferred')
                    .withArgs(ADMIN_ROLE, accountAddr);

                const tx2 = await roleSystem.transferUniqueRole(ADMIN_ROLE, ZeroAddress);

                await expect(tx2)
                    .emit(roleSystem, 'UniqueRoleTransferred')
                    .withArgs(ADMIN_ROLE, ZeroAddress);
            });

            it(`should fail if the sender is not the main account`, async () => {
                const tx = roleSystem.connect(account).transferUniqueRole(ADMIN_ROLE, account);

                await expect(tx).rejectedWith('RoleSystemNotMain');
            });
        });

        describe(`method 'uniqueRoleOwner'`, () => {
            it(`should return the owner`, async () => {
                await roleSystem.transferUniqueRole(ADMIN_ROLE, account);

                const uniqueRoleOwner = await roleSystem.uniqueRoleOwner(ADMIN_ROLE);

                expect(uniqueRoleOwner).equal(accountAddr);
            });

            it(`should fail if the role does not have an owner`, async () => {
                const tx = roleSystem.uniqueRoleOwner(ADMIN_ROLE);

                await expect(tx).rejectedWith('RoleSystemZeroAddress');
            });
        });
    });
});
