import { ethers } from 'ethers';
import { Address, ArtTokenMock, AuctionHouse } from '../typechain-types';
import { Signer } from '../types/environment';
import { deployArtTokenMock } from './utils/deploy-art-token-mock';
import { getChainId } from './utils/get-chain-id';
import { getSigners } from './utils/get-signers';
import { signAuctionPermit } from './utils/sign-auction-permit';
import { AuctionPermitStruct } from '../types/auction-house';
import { encodeAuctionHouseCreateParams } from './utils/encode-auction-house-create-params';

describe('AuctionHouse', function () {
    let auctionHouse: AuctionHouse, auctionHouseAddr: string;

    let chainId: number;

    let platform: Signer, platformAddr: string;
    let auctionSigner: Signer, auctionSignerAddr: string;
    let seller: Signer, sellerAddr: string;
    let buyer: Signer, buyerAddr: string;
    let randomAccount: Signer, randomAccountAddr: string;

    let tokenMock: ArtTokenMock, tokenMockAddr: string;

    before(async () => {
        chainId = await getChainId();

        [
            [platform, auctionSigner, seller, buyer, randomAccount],
            [platformAddr, auctionSignerAddr, sellerAddr, buyerAddr, randomAccountAddr],
        ] = await getSigners();

        [tokenMock, tokenMockAddr] = await deployArtTokenMock();

        tokenMock = tokenMock.connect(seller);
    });

    let tokenId: bigint;
    let price: bigint;
    let step: bigint;
    let penalty: bigint;
    let startTime: number;
    let endTime: number;
    let deadline: number;
    let participants: string[];
    let shares: bigint[];

    it(`should have correct token`, async () => {});

    it(`should have correct initial auction count`, async () => {});

    it(`should have correct auction signer`, async () => {});

    describe(`method 'onERC721Received'`, () => {
        it(`should create correct auction`, async () => {});

        it(`should increase auction count`, async () => {});

        it(`should emit created event`, async () => {});

        it(`should fail if caller is not token contract`, async () => {});

        it(`should fail if data is wrong`, async () => {});

        it(`should fail if signature is expired`, async () => {});

        it(`should fail if signature is invalid`, async () => {});

        it(`should fail if auction signer is invalid`, async () => {});

        it(`should fail if start time lass than end time`, async () => {});

        it(`should fail if end time lass than block time`, async () => {});

        it(`should fail if number of shares is not equal number of participants`, async () => {});

        it(`should fail if total shares is not equal maximum total share`, async () => {});

        it(`should fail if shares and participants are empty`, async () => {});
    });

    describe(`method 'raise' initial`, () => {
        it(`should set buyer if new price is equal initial price`, async () => {});

        it(`should set buyer and price if new price is more than initial price`, async () => {});

        it(`should increase contract balance by new prices`, async () => {});

        it(`should emit raised event`, async () => {});

        it(`should fail if new price is less than initial price`, async () => {});

        it(`should fail if auction does not exist`, async () => {});

        it(`should fail if auction has not started`, async () => {});

        it(`should fail if auction has ended`, async () => {});

        it(`should fail if auction has buyer`, async () => {});
    });

    describe(`method 'raise'`, () => {
        it(`should change buyer and price if new price is equal sum of old price plus step`, async () => {});

        it(`should change buyer and price if new price is more than sum of old price plus step`, async () => {});

        it(`should increase contract balance by diff new and old prices`, async () => {});

        it(`should transfer old price to old buyer`, async () => {});

        it(`should emit raised event`, async () => {});

        it(`should fail if new price is less than sum of old price plus step`, async () => {});

        it(`should fail if auction does not exist`, async () => {});

        it(`should fail if auction has not started`, async () => {});

        it(`should fail if auction has ended`, async () => {});

        it(`should fail if auction does not have buyer`, async () => {});
    });

    describe(`method 'take'`, async () => {
        it(`should mark auction as completed`, async () => {});

        it(`should emit completed event`, async () => {});

        it(`should transfer token to buyer`, async () => {});

        it(`should distribute rewards between participants according to shares`, async () => {});

        it(`should fail if auction does not exist`, async () => {});

        it(`should fail if auction has completed`, async () => {});

        it(`should fail if auction has not ended`, async () => {});

        it(`should fail if auction does not have buyer`, async () => {});
    });

    describe(`method 'buy'`, async () => {
        it(`should set new buyer`, async () => {});

        it(`should mark auction as completed`, async () => {});

        it(`should transfer token to buyer`, async () => {});

        it(`should distribute rewards between participants according to shares`, async () => {});

        it(`should emit completed event`, async () => {});

        it(`should fail if sent value is not equal price`, async () => {});

        it(`should fail if auction does not exist`, async () => {});

        it(`should fail if auction has completed`, async () => {});

        it(`should fail if auction has not ended`, async () => {});

        it(`should fail if auction has buyer`, async () => {});
    });

    describe(`method 'unlock'`, async () => {
        it(`should mark auction as completed`, async () => {});

        it(`should transfer token to seller`, async () => {});

        it(`should transfer penalty to platform`, async () => {});

        it(`should emit completed event`, async () => {});

        it(`should fail if sent value is not equal penalty`, async () => {});

        it(`should fail if auction does not exist`, async () => {});

        it(`should fail if auction has completed`, async () => {});

        it(`should fail if auction has not ended`, async () => {});

        it(`should fail if auction has buyer`, async () => {});
    });

    async function create(
        params: {
            _tokenId?: bigint;
            _seller?: string;
            _asset?: string;
            _price?: bigint;
            _step?: bigint;
            _penalty?: bigint;
            _startTime?: number;
            _endTime?: number;
            _deadline?: number;
            _participants?: string[];
            _shares?: bigint[];
            _auctionSigner?: Signer;
            _tokenMock?: ArtTokenMock;
        } = {},
    ) {
        const {
            _tokenId = tokenId,
            _seller = sellerAddr,
            _asset = ethers.ZeroAddress,
            _price = price,
            _step = step,
            _penalty = penalty,
            _startTime = startTime,
            _endTime = endTime,
            _deadline = deadline,
            _participants = participants,
            _shares = shares,
            _auctionSigner = auctionSigner,
            _tokenMock = tokenMock,
        } = params;

        const permit: AuctionPermitStruct = {
            tokenId: _tokenId,
            seller: _seller,
            asset: _asset,
            price: _price,
            step: _step,
            penalty: _penalty,
            startTime: _startTime,
            endTime: _endTime,
            deadline: _deadline,
            participants: _participants,
            shares: _shares,
        };

        const signature = await signAuctionPermit(
            chainId,
            auctionHouseAddr,
            permit,
            _auctionSigner,
        );

        return _tokenMock['safeTransferFrom(address,address,uint256,bytes)'](
            _seller,
            auctionHouse,
            _tokenId,
            encodeAuctionHouseCreateParams(
                _tokenId,
                _seller,
                _asset,
                _price,
                _step,
                _penalty,
                _startTime,
                _endTime,
                _deadline,
                _participants,
                _shares,
                signature,
            ),
        );
    }

    function raiseInitial() {}
    function raise() {}
    function buy() {}
    function unlock() {}
});
