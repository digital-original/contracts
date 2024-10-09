import { expect } from 'chai';
import { ethers } from 'hardhat';
import { getSigners } from './utils/get-signers';
import { ArtToken, AuctionHouse, USDC } from '../typechain-types';
import { Signer } from '../types/environment';
import { signBuyPermit } from './utils/sign-art-token-buy-permit';
import { getChainId } from './utils/get-chain-id';
import { BuyPermitStruct } from '../types/art-token';
import { TOTAL_SHARE } from '../constants/distribution';
import { getValidDeadline } from './utils/get-valid-deadline';
import { getLatestBlockTimestamp } from './utils/get-latest-block-timestamp';
import { deployProtocol } from '../scripts/deploy-protocol';
import { deployUsdc } from './utils/deploy-usdc';
import { signCreatePermit } from './utils/sign-auction-house-create-permit';
import { CreatePermitStruct } from '../types/auction-house';

describe('ArtToken', function () {
    let artToken: ArtToken, artTokenAddr: string;
    let auctionHouse: AuctionHouse, auctionHouseAddr: string;
    let usdc: USDC, usdcAddr: string;

    let chainId: number;

    let main: Signer, mainAddr: string;
    let admin: Signer, adminAddr: string;
    let financier: Signer, financierAddr: string;
    let institution: Signer, institutionAddr: string;
    let buyer: Signer, buyerAddr: string;
    let randomAccount: Signer, randomAccountAddr: string;

    const adminRole = ethers.keccak256(Buffer.from('ADMIN_ROLE'));
    const financialRole = ethers.keccak256(Buffer.from('FINANCIAL_ROLE'));
    const partnerRole = ethers.keccak256(Buffer.from('PARTNER_ROLE'));

    before(async () => {
        chainId = await getChainId();

        [usdc, usdcAddr] = await deployUsdc();

        [
            [main, admin, financier, institution, buyer, randomAccount],
            [mainAddr, adminAddr, financierAddr, institutionAddr, buyerAddr, randomAccountAddr],
        ] = await getSigners();
    });

    beforeEach(async () => {
        const {
            artToken: _artToken,
            artTokenAddr: _artTokenAddr,
            auctionHouse: _auctionHouse,
            auctionHouseAddr: _auctionHouseAddr,
        } = await deployProtocol({
            main,
            usdc,
            minAuctionDurationHours: 1,
        });

        await _artToken.connect(main).transferUniqueRole(adminRole, admin);
        await _artToken.connect(main).transferUniqueRole(financialRole, financier);
        await _auctionHouse.connect(main).transferUniqueRole(adminRole, admin);
        await _auctionHouse.connect(main).transferUniqueRole(financialRole, financier);

        await usdc.connect(buyer).mint();
        await usdc.connect(buyer).approve(_artToken, ethers.MaxInt256);

        artToken = _artToken.connect(buyer);
        artTokenAddr = _artTokenAddr;
        auctionHouse = _auctionHouse;
        auctionHouseAddr = _auctionHouseAddr;
    });

    let tokenId: bigint;
    let tokenURI: string;
    let price: bigint;
    let fee: bigint;
    let participants: string[];
    let shares: bigint[];
    let deadline: number;

    beforeEach(async () => {
        tokenId = 0n;
        tokenURI = 'ipfs://Q...';
        price = 100_000_000n;
        fee = 100_000_000n;
        participants = [financierAddr, institutionAddr];
        shares = [TOTAL_SHARE / 5n, (TOTAL_SHARE / 5n) * 4n];
        deadline = await getValidDeadline();
    });

    describe(`method 'buy'`, () => {
        it(`should mint token`, async () => {
            await buy();

            await Promise.all([
                expect(artToken.ownerOf(tokenId)).to.eventually.equal(buyerAddr),
                expect(artToken.tokenURI(tokenId)).to.eventually.equal(tokenURI),
                expect(artToken.balanceOf(buyer)).to.eventually.equal(1n),
            ]);
        });

        it(`should transfer fee to financier`, async () => {
            const transaction = await buy();

            await expect(transaction)
                .to.be.emit(usdc, 'Transfer')
                .withArgs(artTokenAddr, financierAddr, fee);
        });

        it(`should transfer price and fee from buyer to contract`, async () => {
            const transaction = await buy();

            await expect(transaction)
                .to.be.emit(usdc, 'Transfer')
                .withArgs(buyerAddr, artTokenAddr, price + fee);
        });

        it(`should fail if token is reserved by auction`, async () => {
            const createPermit: CreatePermitStruct = {
                auctionId: 1n,
                tokenId,
                tokenURI,
                price: 100_000_001n,
                fee: 100_000_001n,
                step: 1_000_001n,
                endTime: deadline,
                participants,
                shares,
                deadline,
            };

            const signature = await signCreatePermit(
                chainId,
                auctionHouseAddr,
                createPermit,
                admin,
            );

            await auctionHouse.create({
                auctionId: createPermit.auctionId,
                tokenId,
                tokenURI,
                price: createPermit.price,
                fee: createPermit.fee,
                step: createPermit.step,
                endTime: createPermit.endTime,
                participants,
                shares,
                signature,
                deadline,
            });

            await expect(buy()).to.be.rejectedWith('ArtTokenReserved');
        });

        describe(`permit logic`, () => {
            it(`should fail if permit signer is not admin`, async () => {
                const _admin = randomAccount;

                await expect(buy({ _admin })).to.be.rejectedWith('EIP712InvalidSignature');
            });

            it(`should fail if permit is expired`, async () => {
                const _deadline = await getLatestBlockTimestamp();

                await expect(buy({ _deadline })).to.be.rejectedWith('EIP712ExpiredSignature');
            });

            it(`should fail if the sender is invalid`, async () => {
                const _artToken = artToken.connect(randomAccount);

                await expect(buy({ _artToken })).to.be.rejectedWith('EIP712InvalidSignature');
            });
        });

        describe(`distribution logic`, () => {
            it(`should distribute reward between participants according to shares`, async () => {
                const transaction = await buy();

                await Promise.all([
                    expect(transaction)
                        .to.be.emit(usdc, 'Transfer')
                        .withArgs(artTokenAddr, participants[0], (price * shares[0]) / TOTAL_SHARE),
                    expect(transaction)
                        .to.be.emit(usdc, 'Transfer')
                        .withArgs(artTokenAddr, participants[1], (price * shares[1]) / TOTAL_SHARE),
                ]);
            });

            it(`should fail if number of shares is not equal number of participants`, async () => {
                const _participants = [financierAddr];
                const _shares = [TOTAL_SHARE / 2n, TOTAL_SHARE / 2n];

                await expect(buy({ _participants, _shares })).to.be.rejectedWith(
                    'DistributionInvalidSharesCount',
                );
            });

            it(`should fail if total shares is not equal TOTAL_SHARE`, async () => {
                const _participants = [financierAddr, institutionAddr];
                const _shares = [TOTAL_SHARE, 1n];

                await expect(buy({ _participants, _shares })).to.be.rejectedWith(
                    'DistributionInvalidSharesSum',
                );
            });

            it(`should fail if shares and participants are empty`, async () => {
                const _participants: string[] = [];
                const _shares: bigint[] = [];

                await expect(buy({ _participants, _shares })).to.be.rejectedWith(
                    'DistributionInvalidSharesSum',
                );
            });
        });
    });

    describe(`method 'transferFrom'`, () => {
        it(`should transfer to a non-contract account`, async () => {
            await buy();

            const transaction = await artToken.transferFrom(buyer, randomAccount, tokenId);

            await expect(transaction)
                .to.be.emit(artToken, 'Transfer')
                .withArgs(buyerAddr, randomAccountAddr, tokenId);
        });

        it(`should transfer to a partner contract`, async () => {
            await buy();

            await artToken.connect(main).grandRole(partnerRole, auctionHouse);

            const transaction = await artToken.transferFrom(buyer, auctionHouse, tokenId);

            await expect(transaction)
                .to.be.emit(artToken, 'Transfer')
                .withArgs(buyerAddr, auctionHouseAddr, tokenId);
        });

        it(`should fail if a token is tried to transfer to a non-partner contract`, async () => {
            await buy();

            await expect(
                artToken.transferFrom(buyer, auctionHouse, tokenId),
            ).to.eventually.rejectedWith('RoleSystemUnauthorizedAccount');
        });
    });

    describe(`method 'safeTransferFrom'`, () => {
        it(`should transfer to a non-contract account`, async () => {
            await buy();

            const transaction = await artToken['safeTransferFrom(address,address,uint256)'](
                buyer,
                randomAccount,
                tokenId,
            );

            await expect(transaction)
                .to.be.emit(artToken, 'Transfer')
                .withArgs(buyerAddr, randomAccountAddr, tokenId);
        });

        it(`should fail if a token is tried to transfer to a non-partner contract`, async () => {
            await buy();

            await expect(
                artToken['safeTransferFrom(address,address,uint256)'](buyer, auctionHouse, tokenId),
            ).to.eventually.rejectedWith('RoleSystemUnauthorizedAccount');
        });
    });

    describe(`method 'approve'`, () => {
        it(`should provide the approval to a non-contract account`, async () => {
            await buy();

            const transaction = await artToken.approve(randomAccountAddr, tokenId);

            await expect(transaction)
                .to.be.emit(artToken, 'Approval')
                .withArgs(buyerAddr, randomAccountAddr, tokenId);
        });

        it(`should provide the approval to a partner contract`, async () => {
            await buy();

            await artToken.connect(main).grandRole(partnerRole, auctionHouse);

            const transaction = await artToken.approve(auctionHouse, tokenId);

            await expect(transaction)
                .to.be.emit(artToken, 'Approval')
                .withArgs(buyerAddr, auctionHouseAddr, tokenId);
        });

        it(`should fail if the approval is tried to provide to a non-partner contract`, async () => {
            await buy();

            await expect(artToken.approve(auctionHouse, tokenId)).to.eventually.rejectedWith(
                'RoleSystemUnauthorizedAccount',
            );
        });
    });

    describe(`method 'setApprovalForAll'`, () => {
        it(`should provide the approval to a non-contract account`, async () => {
            await buy();

            const transaction = await artToken.setApprovalForAll(randomAccountAddr, true);

            await expect(transaction)
                .to.be.emit(artToken, 'ApprovalForAll')
                .withArgs(buyerAddr, randomAccountAddr, true);
        });

        it(`should provide the approval to a partner contract`, async () => {
            await buy();

            await artToken.connect(main).grandRole(partnerRole, auctionHouse);

            const transaction = await artToken.setApprovalForAll(auctionHouse, true);

            await expect(transaction)
                .to.be.emit(artToken, 'ApprovalForAll')
                .withArgs(buyerAddr, auctionHouseAddr, true);
        });

        it(`should fail if the approval is tried to provide to a non-partner contract`, async () => {
            await buy();

            await expect(artToken.setApprovalForAll(auctionHouse, true)).to.eventually.rejectedWith(
                'RoleSystemUnauthorizedAccount',
            );
        });
    });

    async function buy(
        params: {
            _tokenId?: bigint;
            _tokenURI?: string;
            _sender?: string;
            _price?: bigint;
            _fee?: bigint;
            _participants?: string[];
            _shares?: bigint[];
            _deadline?: number;
            _admin?: Signer;
            _artToken?: ArtToken;
        } = {},
    ) {
        const {
            _tokenId = tokenId,
            _tokenURI = tokenURI,
            _sender = buyerAddr,
            _price = price,
            _fee = fee,
            _participants = participants,
            _shares = shares,
            _deadline = deadline,
            _admin = admin,
            _artToken = artToken,
        } = params;

        const permit: BuyPermitStruct = {
            tokenId: _tokenId,
            tokenURI: _tokenURI,
            sender: _sender,
            price: _price,
            fee: _fee,
            participants: _participants,
            shares: _shares,
            deadline: _deadline,
        };

        const signature = await signBuyPermit(chainId, artTokenAddr, permit, _admin);

        return _artToken.buy({
            tokenId: _tokenId,
            tokenURI: _tokenURI,
            price: _price,
            fee: _fee,
            participants: _participants,
            shares: _shares,
            signature,
            deadline: _deadline,
        });
    }
});
