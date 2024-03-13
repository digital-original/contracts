import { expect } from 'chai';
import { getSigners } from './utils/get-signers';
import { CollabToken, ArtTokenMock, AuctionHouseMock } from '../typechain-types';
import { Signer } from '../types/environment';
import { deployCollabToken } from './utils/deploy-collab-token';
import { deployAuctionHouseMock } from './utils/deploy-auction-house-mock';
import { deployArtTokenMock } from './utils/deploy-art-token-mock';
import { ethers } from 'hardhat';

describe('CollabToken', function () {
    let token: CollabToken, tokenAddr: string;

    let artTokenMock: ArtTokenMock, artTokenMockAddr: string;
    let partner: Signer, partnerAddr: string;
    let randomAccount: Signer, randomAccountAddr: string;
    let auctionHouseMock: AuctionHouseMock, auctionHouseMockAddr: string;

    before(async () => {
        [[partner, randomAccount], [partnerAddr, randomAccountAddr]] = await getSigners();
    });

    let tokenId: bigint;
    let artTokenId: bigint;
    let guarantee: bigint;

    beforeEach(async () => {
        tokenId = 123n;
        artTokenId = 321n;
        guarantee = 10000n;

        [auctionHouseMock, auctionHouseMockAddr] = await deployAuctionHouseMock();
        [artTokenMock, artTokenMockAddr] = await deployArtTokenMock();
        [token, tokenAddr] = await deployCollabToken(artTokenMock, auctionHouseMock);
    });

    describe(`method 'mint'`, () => {
        it(`should mint token with right agreement`, async () => {
            await artTokenMock.mitCollabToken(token, partner, tokenId, artTokenId, guarantee);

            const agreement = await token.agreement(tokenId);

            expect(agreement.artTokenId).equal(artTokenId);
            expect(agreement.guarantee).equal(guarantee);
            await expect(token.ownerOf(tokenId)).to.eventually.equal(partnerAddr);
        });

        it(`should fail if caller is unauthorized`, async () => {
            await expect(
                token.connect(randomAccount).mint(partner, tokenId, artTokenId, guarantee),
            ).to.eventually.rejectedWith('CollabTokenUnauthorizedAccount');
        });
    });

    describe(`method 'burn'`, () => {
        beforeEach(async () => {
            await artTokenMock.mitCollabToken(token, partner, tokenId, artTokenId, guarantee, {
                value: guarantee,
            });

            token = token.connect(partner);
        });

        it(`should burn token`, async () => {
            await artTokenMock.mint(randomAccount, artTokenId);

            await token.burn(tokenId);

            await expect(token.ownerOf(tokenId)).to.eventually.rejectedWith(
                'ERC721NonexistentToken',
            );
        });

        it(`should transfer guarantee to token owner`, async () => {
            await artTokenMock.mint(randomAccount, artTokenId);

            await expect(token.burn(tokenId)).changeEtherBalances(
                [token, partner],
                [guarantee * -1n, guarantee],
            );
        });

        it(`should fail caller is not token owner`, async () => {
            await expect(token.connect(randomAccount).burn(tokenId)).to.eventually.rejectedWith(
                'CollabTokenUnauthorizedAccount',
            );
        });

        it(`should fail agreement not fulfilled`, async () => {
            await artTokenMock.mint(auctionHouseMock, artTokenId);

            await expect(token.burn(tokenId)).to.eventually.rejectedWith('AgreementNotFulfilled');
        });
    });
});
