import { expect } from 'chai';
import { setNextBlockTimestamp } from '@nomicfoundation/hardhat-network-helpers/dist/src/helpers/time';
import { MAX_TOTAL_SHARE } from '../constants/base-market';
import { getChainId } from './utils/get-chain-id';
import { getSigners } from './utils/get-signers';
import { deployTokenMock } from './utils/deploy-token-mock';
import { deployMarketUpgradeable } from './utils/deploy-market-upgradable';
import { encodeMarketPlaceParams } from './utils/encode-market-place-params';
import { getLatestBlock } from './utils/get-latest-block';
import { signMarketPermit } from './utils/sign-market-permit';
import { Signer } from '../types/environment';
import { MarketPermitStruct } from '../types/market';
import { Market, TokenMock } from '../typechain-types';

describe('Market', function () {
    let market: Market, marketAddr: string;

    let chainId: number;

    let platform: Signer, platformAddr: string;
    let marketSigner: Signer, marketSignerAddr: string;
    let tokenOwner: Signer, tokenOwnerAddr: string;
    let buyer: Signer, buyerAddr: string;
    let randomAccount: Signer, randomAccountAddr: string;

    let tokenMock: TokenMock, tokenMockAddr: string;

    enum OrderStatus {
        NotExists,
        Placed,
        Realized,
        Cancelled,
    }

    let tokenId: bigint;
    let seller: string;
    let price: bigint;
    let deadline: number;
    let participants: string[];
    let shares: bigint[];

    async function placeOrder(
        params: {
            _tokenId?: bigint;
            _seller?: string;
            _price?: bigint;
            _deadline?: number;
            _participants?: string[];
            _shares?: bigint[];
            _tokenMock?: TokenMock;
            _marketSigner?: Signer;
        } = {},
    ) {
        const {
            _tokenId = tokenId,
            _seller = seller,
            _price = price,
            _deadline = deadline,
            _participants = participants,
            _shares = shares,
            _tokenMock = tokenMock,
            _marketSigner = marketSigner,
        } = params;

        const permit: MarketPermitStruct = {
            seller: _seller,
            tokenId: _tokenId,
            price: _price,
            participants: _participants,
            shares: _shares,
            deadline: _deadline,
        };

        const signature = await signMarketPermit(chainId, marketAddr, permit, _marketSigner);

        return _tokenMock['safeTransferFrom(address,address,uint256,bytes)'](
            _seller,
            market,
            _tokenId,
            encodeMarketPlaceParams(_price, _deadline, _participants, _shares, signature),
        );
    }

    function realize(params: { orderId: number; _price?: bigint; _market?: Market }) {
        const { orderId, _price = price, _market = market } = params;

        return _market.realize(orderId, { value: _price });
    }

    function cancel(params: { orderId: number; _market?: Market }) {
        const { orderId, _market = market } = params;

        return _market.cancel(orderId);
    }

    async function mintToken() {
        const tokenId = await tokenMock.totalSupply();

        await tokenMock.mint(tokenOwner, tokenId);

        return tokenId;
    }

    async function getSignatureDeadline() {
        const block = await getLatestBlock();
        const oneHourS = 60 * 60;
        const deadline = block.timestamp + oneHourS;
        return deadline;
    }

    before(async () => {
        chainId = await getChainId();

        [
            [platform, marketSigner, tokenOwner, buyer, randomAccount],
            [platformAddr, marketSignerAddr, tokenOwnerAddr, buyerAddr, randomAccountAddr],
        ] = await getSigners();

        [tokenMock, tokenMockAddr] = await deployTokenMock();

        tokenMock = tokenMock.connect(tokenOwner);
    });

    beforeEach(async () => {
        [[market, marketAddr], tokenId] = await Promise.all([
            deployMarketUpgradeable(tokenMock, marketSigner),
            mintToken(),
        ]);

        seller = tokenOwnerAddr;
        price = 100000n;
        participants = [tokenOwnerAddr, platformAddr];
        shares = [MAX_TOTAL_SHARE / 2n, MAX_TOTAL_SHARE / 2n];
        deadline = await getSignatureDeadline();
    });

    it(`should have correct token`, async () => {
        await expect(market.TOKEN()).to.eventually.equal(tokenMockAddr);
    });

    it(`should have correct maximum total share`, async () => {
        await expect(market.MAX_TOTAL_SHARE()).to.eventually.equal(MAX_TOTAL_SHARE);
    });

    it(`should have correct initial order count`, async () => {
        await expect(market.orderCount()).to.eventually.equal(0n);
    });

    it(`should have correct market signer`, async () => {
        await expect(market.MARKET_SIGNER()).to.eventually.equal(marketSignerAddr);
    });

    describe(`method 'onERC721Received'`, () => {
        it(`should place correct order`, async () => {
            await placeOrder();

            const order = await market.order(0);

            expect(order.seller).equal(seller);
            expect(order.tokenId).equal(tokenId);
            expect(order.price).equal(price);
            expect(order.status).equal(OrderStatus.Placed);
            expect(order.participants).to.deep.equal(participants);
            expect(order.shares).to.deep.equal(shares);
        });

        it(`should emit placed event`, async () => {
            await expect(placeOrder())
                .to.emit(market, 'Placed')
                .withArgs(0, tokenId, seller, price);
        });

        it(`should increase order count`, async () => {
            await placeOrder();

            await expect(market.orderCount()).eventually.equal(1);
        });

        it(`should fail if signature is expired`, async () => {
            const _deadline = await getSignatureDeadline();

            await setNextBlockTimestamp(_deadline + 10);

            await expect(placeOrder({ _deadline })).to.be.rejectedWith(
                'MarketSignerExpiredSignature',
            );
        });

        it(`should fail if number of shares is not equal number of participants`, async () => {
            const _participants = [tokenOwnerAddr];
            const _shares = [MAX_TOTAL_SHARE / 2n, MAX_TOTAL_SHARE / 2n];

            await expect(placeOrder({ _participants, _shares })).to.be.rejectedWith(
                'BaseMarketInvalidSharesNumber',
            );
        });

        it(`should fail if total shares is not equal maximum total share`, async () => {
            const _participants = [tokenOwnerAddr, platformAddr];
            const _shares = [MAX_TOTAL_SHARE, 1n];

            await expect(placeOrder({ _participants, _shares })).to.be.rejectedWith(
                'BaseMarketInvalidSharesSum',
            );
        });

        it(`should fail if shares and participants are empty`, async () => {
            const _participants: string[] = [];
            const _shares: bigint[] = [];

            await expect(placeOrder({ _participants, _shares })).to.be.rejectedWith(
                'BaseMarketInvalidSharesSum',
            );
        });

        it(`should fail if market signer is invalid`, async () => {
            const _marketSigner = randomAccount;

            await expect(placeOrder({ _marketSigner })).to.be.rejectedWith(
                'MarketSignerInvalidSigner',
            );
        });

        it(`should fail if caller is not token contract`, async () => {
            const marketPermit: MarketPermitStruct = {
                seller,
                tokenId,
                price,
                participants,
                shares,
                deadline,
            };

            const signature = await signMarketPermit(
                chainId,
                marketAddr,
                marketPermit,
                marketSigner,
            );

            await expect(
                market.onERC721Received(
                    tokenOwnerAddr,
                    tokenOwnerAddr,
                    tokenId,
                    encodeMarketPlaceParams(price, deadline, participants, shares, signature),
                ),
            ).to.be.rejectedWith('BaseMarketUnauthorizedAccount');
        });
    });

    describe(`method 'realize'`, () => {
        beforeEach(async () => {
            await placeOrder();

            market = market.connect(buyer);
        });

        it(`should transfer token to buyer`, async () => {
            await expect(realize({ orderId: 0 }))
                .to.be.emit(tokenMock, 'Transfer')
                .withArgs(marketAddr, buyerAddr, tokenId);

            await expect(tokenMock.ownerOf(tokenId)).to.be.eventually.equal(buyerAddr);
        });

        it(`should distribute reward between participants according to shares`, async () => {
            await expect(() => realize({ orderId: 0 })).to.be.changeEtherBalances(
                [buyer, ...participants],
                [price * -1n, ...shares.map((share) => (price * share) / MAX_TOTAL_SHARE)],
            );
        });

        it(`should change order status to realized`, async () => {
            await realize({ orderId: 0 });

            const order = await market.order(0);

            expect(order.status).equal(OrderStatus.Realized);
        });

        it(`should emit realized event`, async () => {
            await expect(realize({ orderId: 0 }))
                .to.be.emit(market, 'Realized')
                .withArgs(0, tokenId, buyerAddr, seller, price);
        });

        it(`should fail if invalid ether amount`, async () => {
            const _price = price - 1n;

            await expect(realize({ orderId: 0, _price })).to.be.rejectedWith('MarketInvalidAmount');
        });

        it(`should fail if order is already realized`, async () => {
            await realize({ orderId: 0 });

            await expect(realize({ orderId: 0 })).to.be.rejectedWith('BaseMarketOrderNotPlaced');
        });

        it(`should fail if order is cancelled`, async () => {
            const _market = market.connect(tokenOwner);

            await cancel({ _market, orderId: 0 });

            await expect(realize({ orderId: 0 })).to.be.rejectedWith('BaseMarketOrderNotPlaced');
        });

        it(`should fail if order doesn't exist`, async () => {
            await expect(realize({ orderId: 1 })).to.be.rejectedWith('BaseMarketOrderNotPlaced');
        });

        it(`should fail if caller is seller`, async () => {
            const _market = market.connect(tokenOwner);

            await expect(realize({ _market, orderId: 0 })).to.be.rejectedWith('MarketInvalidBuyer');
        });
    });

    describe(`method 'cancel'`, () => {
        let orderId: bigint;

        beforeEach(async () => {
            await placeOrder();

            orderId = (await market.orderCount()) - 1n;

            market = market.connect(tokenOwner);
        });

        it(`should transfer token back to seller`, async () => {
            await expect(cancel({ orderId: 0 }))
                .to.be.emit(tokenMock, 'Transfer')
                .withArgs(marketAddr, tokenOwnerAddr, tokenId);

            await expect(tokenMock.ownerOf(tokenId)).to.be.eventually.equal(tokenOwnerAddr);
        });

        it(`should emit cancelled event`, async () => {
            await expect(cancel({ orderId: 0 }))
                .to.be.emit(market, 'Cancelled')
                .withArgs(orderId, tokenId, tokenOwnerAddr);
        });

        it(`should change order status to cancelled`, async () => {
            await cancel({ orderId: 0 });

            const order = await market.order(orderId);

            expect(order.status).equal(OrderStatus.Cancelled);
        });

        it(`should fail if order doesn't exist`, async () => {
            await expect(cancel({ orderId: 1 })).to.be.rejectedWith('BaseMarketOrderNotPlaced');
        });

        it(`should fail if order is already cancelled`, async () => {
            await cancel({ orderId: 0 });

            await expect(cancel({ orderId: 0 })).to.be.rejectedWith('BaseMarketOrderNotPlaced');
        });

        it(`should fail if order is realized`, async () => {
            const _market = market.connect(buyer);

            await realize({ _market, orderId: 0 });

            await expect(cancel({ orderId: 0 })).to.be.rejectedWith('BaseMarketOrderNotPlaced');
        });

        it(`should fail if caller is not seller`, async () => {
            const _market = market.connect(randomAccount);

            await expect(cancel({ _market, orderId: 0 })).to.be.rejectedWith(
                'MarketUnauthorizedAccount',
            );
        });
    });
});
