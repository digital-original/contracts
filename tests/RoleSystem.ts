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
                const transaction = await roleSystem.grantRole(ADMIN_ROLE, account);

                await expect(transaction)
                    .to.be.emit(roleSystem, 'RoleGranted')
                    .withArgs(ADMIN_ROLE, accountAddr);

                await expect(roleSystem.hasRole(ADMIN_ROLE, account)).to.eventually.equal(true);
            });

            it(`should fail if the sender is not the main account`, async () => {
                await expect(
                    roleSystem.connect(account).grantRole(ADMIN_ROLE, account),
                ).to.eventually.rejectedWith('RoleSystemNotMain');
            });
        });

        describe(`method 'revokeRole'`, () => {
            beforeEach(async () => {
                await roleSystem.grantRole(ADMIN_ROLE, account);
            });

            it(`should revoke a role`, async () => {
                const transaction = await roleSystem.revokeRole(ADMIN_ROLE, account);

                await expect(transaction)
                    .to.be.emit(roleSystem, 'RoleRevoked')
                    .withArgs(ADMIN_ROLE, accountAddr);

                await expect(roleSystem.hasRole(ADMIN_ROLE, account)).to.eventually.equal(false);
            });

            it(`should fail if the sender is not the main account`, async () => {
                await expect(
                    roleSystem.connect(account).revokeRole(ADMIN_ROLE, account),
                ).to.eventually.rejectedWith('RoleSystemNotMain');
            });
        });

        describe(`method 'hasRole'`, () => {
            it(`should return the correct value`, async () => {
                await roleSystem.grantRole(ADMIN_ROLE, account);

                await expect(roleSystem.hasRole(ADMIN_ROLE, account)).to.eventually.equal(true);

                await roleSystem.revokeRole(ADMIN_ROLE, account);

                await expect(roleSystem.hasRole(ADMIN_ROLE, account)).to.eventually.equal(false);
            });

            it(`should fail if the account is the zero address`, async () => {
                await expect(roleSystem.hasRole(ADMIN_ROLE, ZeroAddress)) //
                    .to.eventually.rejectedWith('RoleSystemZeroAddress');
            });
        });
    });

    describe(`unique roles`, () => {
        describe(`method 'transferUniqueRole'`, () => {
            it(`should transfer a unique role`, async () => {
                const tx1 = await roleSystem.transferUniqueRole(ADMIN_ROLE, account);

                await expect(tx1)
                    .to.be.emit(roleSystem, 'UniqueRoleTransferred')
                    .withArgs(ADMIN_ROLE, accountAddr);

                const tx2 = await roleSystem.transferUniqueRole(ADMIN_ROLE, ZeroAddress);

                await expect(tx2)
                    .to.be.emit(roleSystem, 'UniqueRoleTransferred')
                    .withArgs(ADMIN_ROLE, ZeroAddress);
            });

            it(`should fail if the sender is not the main account`, async () => {
                const tx = roleSystem.connect(account).transferUniqueRole(ADMIN_ROLE, account);

                await expect(tx).to.eventually.rejectedWith('RoleSystemNotMain');
            });
        });

        describe(`method 'uniqueRoleOwner'`, () => {
            it(`should return the owner`, async () => {
                await roleSystem.transferUniqueRole(ADMIN_ROLE, account);

                await expect(roleSystem.uniqueRoleOwner(ADMIN_ROLE)) //
                    .to.eventually.equal(accountAddr);
            });

            it(`should fail if the role does not have an owner`, async () => {
                const tx = roleSystem.uniqueRoleOwner(ADMIN_ROLE);

                await expect(tx).to.eventually.rejectedWith('RoleSystemZeroAddress');
            });
        });
    });
});
