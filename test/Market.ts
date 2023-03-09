import { ethers } from 'hardhat';
import { ContractTransaction } from 'ethers';
import { mineUpTo } from '@nomicfoundation/hardhat-network-helpers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { deployClassic } from '../scripts/deploy-classic';
import { deployUpgradeable } from '../scripts/deploy-upgradable';
import { OrderTypedDataInterface, signMarketOrder } from '../scripts/eip712';
import { Market, CollectionMock } from '../typechain-types';

describe('Market', function () {
    let market: Market;
    let collectionMock: CollectionMock;
    let collectionBaseUri: string;

    let owner: SignerWithAddress;
    let marketSigner: SignerWithAddress;
    let tokenOwner: SignerWithAddress;
    let buyer: SignerWithAddress;
    let randomAccount: SignerWithAddress;

    enum OrderStatus {
        NotExists,
        Placed,
        Bought,
        Cancelled,
    }

    before(async () => {
        [owner, marketSigner, tokenOwner, buyer, randomAccount] = <SignerWithAddress[]>(
            await ethers.getSigners()
        );

        collectionBaseUri = 'https://base-uri-mock/';
        collectionMock = <CollectionMock>await deployClassic({
            contractName: 'CollectionMock',
            constructorArgs: [collectionBaseUri],
            signer: owner,
        });
    });

    beforeEach(async () => {
        const { proxyWithImpl } = await deployUpgradeable({
            contractName: 'Market',
            proxyAdminAddress: '0x0000000000000000000000000000000000000001',
            initializeArgs: [
                collectionMock.address,
                marketSigner.address,
                '0x0000000000000000000000000000000000000001',
            ],
            signer: owner,
        });

        market = <Market>proxyWithImpl;

        collectionMock = collectionMock.connect(owner);
        market = market.connect(owner);
    });

    it(`should have correct market signer`, async () => {
        await expect(market['marketSigner()']()).to.eventually.equal(marketSigner.address);
    });

    it(`should have correct collection`, async () => {
        await expect(market.collection()).to.eventually.equal(collectionMock.address);
    });

    it(`should have correct order count`, async () => {
        const orderCount = await market.orderCount();

        expect(orderCount.toString()).equal('0');
    });

    it(`owner can change market signer`, async () => {
        await market['marketSigner(address)'](randomAccount.address);

        await expect(market['marketSigner()']()).to.eventually.equal(randomAccount.address);
    });

    it(`random account can't change marketSigner`, async () => {
        market = market.connect(randomAccount);

        await expect(market['marketSigner(address)'](randomAccount.address)).to.be.rejectedWith(
            'Ownable: caller is not the owner'
        );
    });

    describe(`method 'place'`, () => {
        let tokenId: string;

        beforeEach(async () => {
            tokenId = (await collectionMock.totalSupply()).toString();

            market = market.connect(tokenOwner);
            collectionMock = collectionMock.connect(tokenOwner);

            await collectionMock.mint(tokenOwner.address, tokenId);
            await collectionMock.approve(market.address, tokenId);
        });

        it(`should place order if data and signature are valid`, async () => {
            const order = {
                seller: tokenOwner.address,
                tokenId,
                price: '100000',
                participants: [owner.address, tokenOwner.address],
                shares: ['50000', '50000'],
            };

            const blockNumber = await ethers.provider.getBlockNumber();
            const expiredBlock = blockNumber + 10;

            const orderTypedData: OrderTypedDataInterface = { ...order, expiredBlock };

            const signature = await signMarketOrder(marketSigner, market.address, orderTypedData);

            await market.place(
                order.tokenId,
                order.price,
                expiredBlock,
                order.participants,
                order.shares,
                signature
            );

            const placedOrder = await market.order(0);

            expect(placedOrder.seller).equal(tokenOwner.address);
            expect(placedOrder.tokenId.toString()).equal(order.tokenId);
            expect(placedOrder.price.toString()).equal(order.price);
            expect(placedOrder.status).equal(OrderStatus.Placed);
        });

        it(`should emit Placed event`, async () => {
            const orderId = '0';

            const order = {
                seller: tokenOwner.address,
                tokenId,
                price: '100000',
                participants: [owner.address, tokenOwner.address],
                shares: ['50000', '50000'],
            };

            const blockNumber = await ethers.provider.getBlockNumber();
            const expiredBlock = blockNumber + 10;

            const orderTypedData: OrderTypedDataInterface = { ...order, expiredBlock };

            const signature = await signMarketOrder(marketSigner, market.address, orderTypedData);

            await expect(
                market.place(
                    order.tokenId,
                    order.price,
                    expiredBlock,
                    order.participants,
                    order.shares,
                    signature
                )
            )
                .to.emit(market, 'Placed')
                .withArgs(orderId, tokenId, tokenOwner.address, order.price);
        });

        it(`should increase order count`, async () => {
            const order = {
                seller: tokenOwner.address,
                tokenId,
                price: '100000',
                participants: [owner.address, tokenOwner.address],
                shares: ['50000', '50000'],
            };

            const blockNumber = await ethers.provider.getBlockNumber();
            const expiredBlock = blockNumber + 10;

            const orderTypedData: OrderTypedDataInterface = { ...order, expiredBlock };

            const signature = await signMarketOrder(marketSigner, market.address, orderTypedData);

            await market.place(
                order.tokenId,
                order.price,
                expiredBlock,
                order.participants,
                order.shares,
                signature
            );

            const orderCount = await market.orderCount();

            expect(orderCount.toString()).equal('1');
        });

        it(`should transfer token to Market`, async () => {
            const order = {
                seller: tokenOwner.address,
                tokenId,
                price: '100000',
                participants: [owner.address, tokenOwner.address],
                shares: ['50000', '50000'],
            };

            const blockNumber = await ethers.provider.getBlockNumber();
            const expiredBlock = blockNumber + 10;

            const orderTypedData: OrderTypedDataInterface = { ...order, expiredBlock };

            const signature = await signMarketOrder(marketSigner, market.address, orderTypedData);

            await expect(
                market.place(
                    order.tokenId,
                    order.price,
                    expiredBlock,
                    order.participants,
                    order.shares,
                    signature
                )
            )
                .to.be.emit(collectionMock, 'Transfer')
                .withArgs(tokenOwner.address, market.address, tokenId);
            await expect(collectionMock.ownerOf(tokenId)).to.eventually.equal(market.address);
        });

        it(`should fail if expired block number less than current`, async () => {
            const order = {
                seller: tokenOwner.address,
                tokenId,
                price: '100000',
                participants: [owner.address, tokenOwner.address],
                shares: ['50000', '50000'],
            };

            const blockNumber = await ethers.provider.getBlockNumber();
            const expiredBlock = blockNumber + 10;

            const orderTypedData: OrderTypedDataInterface = { ...order, expiredBlock };

            const signature = await signMarketOrder(marketSigner, market.address, orderTypedData);

            await mineUpTo(expiredBlock + 1);

            await expect(
                market.place(
                    order.tokenId,
                    order.price,
                    expiredBlock,
                    order.participants,
                    order.shares,
                    signature
                )
            ).to.be.rejectedWith('Market: unauthorized');
        });

        it(`should fail if number of participants isn't equal number of shares`, async () => {
            const order = {
                seller: tokenOwner.address,
                tokenId,
                price: '100000',
                participants: [owner.address, tokenOwner.address],
                shares: ['100000'],
            };

            const blockNumber = await ethers.provider.getBlockNumber();
            const expiredBlock = blockNumber + 10;

            const orderTypedData: OrderTypedDataInterface = { ...order, expiredBlock };

            const signature = await signMarketOrder(marketSigner, market.address, orderTypedData);

            await expect(
                market.place(
                    order.tokenId,
                    order.price,
                    expiredBlock,
                    order.participants,
                    order.shares,
                    signature
                )
            ).to.be.rejectedWith('Market: invalid order');
        });

        it(`should fail if total shares isn't equal price`, async () => {
            const order = {
                seller: tokenOwner.address,
                tokenId,
                price: '100000',
                participants: [owner.address, tokenOwner.address],
                shares: ['50000', '40000'],
            };

            const blockNumber = await ethers.provider.getBlockNumber();
            const expiredBlock = blockNumber + 10;

            const orderTypedData: OrderTypedDataInterface = { ...order, expiredBlock };

            const signature = await signMarketOrder(marketSigner, market.address, orderTypedData);

            await expect(
                market.place(
                    order.tokenId,
                    order.price,
                    expiredBlock,
                    order.participants,
                    order.shares,
                    signature
                )
            ).to.be.rejectedWith('Market: invalid order');
        });

        it(`should fail if market signer is invalid`, async () => {
            const order = {
                seller: tokenOwner.address,
                tokenId,
                price: '100000',
                participants: [owner.address, tokenOwner.address],
                shares: ['50000', '40000'],
            };

            const blockNumber = await ethers.provider.getBlockNumber();
            const expiredBlock = blockNumber + 10;

            const orderTypedData: OrderTypedDataInterface = { ...order, expiredBlock };

            const signature = await signMarketOrder(randomAccount, market.address, orderTypedData);

            await expect(
                market.place(
                    order.tokenId,
                    order.price,
                    expiredBlock,
                    order.participants,
                    order.shares,
                    signature
                )
            ).to.be.rejectedWith('Market: unauthorized');
        });

        it(`should fail if token owner is incorrect`, async () => {
            const order = {
                seller: randomAccount.address,
                tokenId,
                price: '100000',
                participants: [owner.address, randomAccount.address],
                shares: ['50000', '50000'],
            };

            const blockNumber = await ethers.provider.getBlockNumber();
            const expiredBlock = blockNumber + 10;

            const orderTypedData: OrderTypedDataInterface = { ...order, expiredBlock };

            const signature = await signMarketOrder(marketSigner, market.address, orderTypedData);

            market = market.connect(randomAccount);

            await expect(
                market.place(
                    order.tokenId,
                    order.price,
                    expiredBlock,
                    order.participants,
                    order.shares,
                    signature
                )
            ).to.be.rejectedWith('ERC721: transfer from incorrect owner');
        });

        it(`should fail if token doesn't exist`, async () => {
            const order = {
                seller: tokenOwner.address,
                tokenId: '1234',
                price: '100000',
                participants: [owner.address, tokenOwner.address],
                shares: ['50000', '50000'],
            };

            const blockNumber = await ethers.provider.getBlockNumber();
            const expiredBlock = blockNumber + 10;

            const orderTypedData: OrderTypedDataInterface = { ...order, expiredBlock };

            const signature = await signMarketOrder(marketSigner, market.address, orderTypedData);

            await expect(
                market.place(
                    order.tokenId,
                    order.price,
                    expiredBlock,
                    order.participants,
                    order.shares,
                    signature
                )
            ).to.be.rejectedWith('ERC721: invalid token ID');
        });

        it(`should fail if token owner didn't approve token transfer for market contract`, async () => {
            await collectionMock.transferFrom(tokenOwner.address, randomAccount.address, tokenId);

            [tokenOwner, randomAccount] = [randomAccount, tokenOwner];

            market = market.connect(tokenOwner);
            collectionMock = collectionMock.connect(tokenOwner);

            const order = {
                seller: tokenOwner.address,
                tokenId,
                price: '100000',
                participants: [owner.address, tokenOwner.address],
                shares: ['50000', '50000'],
            };

            const blockNumber = await ethers.provider.getBlockNumber();
            const expiredBlock = blockNumber + 10;

            const orderTypedData: OrderTypedDataInterface = { ...order, expiredBlock };

            const signature = await signMarketOrder(marketSigner, market.address, orderTypedData);

            await expect(
                market.place(
                    order.tokenId,
                    order.price,
                    expiredBlock,
                    order.participants,
                    order.shares,
                    signature
                )
            ).to.be.rejectedWith('ERC721: caller is not token owner or approved');

            [tokenOwner, randomAccount] = [randomAccount, tokenOwner];
        });
    });

    describe(`method 'buy'`, () => {
        let tokenId: string;
        let price: string;
        let participants: string[];
        let shares: string[];
        let orderId: string;

        beforeEach(async () => {
            tokenId = (await collectionMock.totalSupply()).toString();
            price = '100000';
            participants = [owner.address, tokenOwner.address, randomAccount.address];
            shares = ['40000', '35000', '25000'];
            orderId = '0';

            market = market.connect(tokenOwner);
            collectionMock = collectionMock.connect(tokenOwner);

            await collectionMock.mint(tokenOwner.address, tokenId);
            await collectionMock.approve(market.address, tokenId);

            const order = {
                seller: tokenOwner.address,
                tokenId,
                price,
                participants,
                shares,
            };

            const blockNumber = await ethers.provider.getBlockNumber();
            const expiredBlock = blockNumber + 10;

            const orderTypedData: OrderTypedDataInterface = { ...order, expiredBlock };

            const signature = await signMarketOrder(marketSigner, market.address, orderTypedData);

            await market.place(
                order.tokenId,
                order.price,
                expiredBlock,
                order.participants,
                order.shares,
                signature
            );

            market = market.connect(buyer);
            collectionMock = collectionMock.connect(buyer);
        });

        it(`should transfer token to buyer`, async () => {
            await expect(market.buy(orderId, { value: price }))
                .to.be.emit(collectionMock, 'Transfer')
                .withArgs(market.address, buyer.address, tokenId);
            await expect(collectionMock.ownerOf(tokenId)).to.be.eventually.equal(buyer.address);
        });

        it(`should distribute ETH between participants according to shares`, async () => {
            await expect(() => market.buy(orderId, { value: price })).to.be.changeEtherBalances(
                [buyer, ...participants],
                [Number(price) * -1, ...shares]
            );
        });

        it(`should change order status to bought`, async () => {
            await market.buy(orderId, { value: price });

            const order = await market.order(orderId);

            expect(order.status).equal(OrderStatus.Bought);
        });

        it(`should emit Bought event`, async () => {
            await expect(market.buy(orderId, { value: price }))
                .to.be.emit(market, 'Bought')
                .withArgs(orderId, tokenId, buyer.address, tokenOwner.address, price);
        });

        it(`should fail if invalid ether amount`, async () => {
            await expect(market.buy(orderId, { value: Number(price) - 1 })).to.be.rejectedWith(
                'Market: invalid ether amount'
            );
        });

        it(`should fail if order is already bought`, async () => {
            await market.buy(orderId, { value: price });

            await expect(market.buy(orderId, { value: price })).to.be.rejectedWith(
                'Market: order is not placed'
            );
        });

        it(`should fail if order is cancelled`, async () => {
            await market.connect(tokenOwner).cancel(orderId);

            await expect(market.buy(orderId, { value: price })).to.be.rejectedWith(
                'Market: order is not placed'
            );
        });

        it(`should fail if order doesn't exist`, async () => {
            await expect(market.buy('1', { value: '123' })).to.be.rejectedWith(
                'BaseMarket: order is not placed'
            );
        });
    });

    describe('order cancel', () => {
        let tokenId: string;
        let price: string;
        let orderId: string;

        beforeEach(async () => {
            tokenId = (await collectionMock.totalSupply()).toString();
            price = '110000';
            orderId = '0';

            market = market.connect(tokenOwner);
            collectionMock = collectionMock.connect(tokenOwner);

            await collectionMock.mint(tokenOwner.address, tokenId);
            await collectionMock.approve(market.address, tokenId);

            const order = {
                seller: tokenOwner.address,
                tokenId,
                price,
                participants: [owner.address, tokenOwner.address],
                shares: ['65000', '45000'],
            };

            const blockNumber = await ethers.provider.getBlockNumber();
            const expiredBlock = blockNumber + 10;

            const orderTypedData: OrderTypedDataInterface = { ...order, expiredBlock };

            const signature = await signMarketOrder(marketSigner, market.address, orderTypedData);

            await market.place(
                order.tokenId,
                order.price,
                expiredBlock,
                order.participants,
                order.shares,
                signature
            );
        });

        describe(`method 'cancel'`, () => {
            shouldBehaveLikeCancel((orderId: string, from: SignerWithAddress) =>
                market.cancel(orderId)
            );

            it(`should fail if caller is random account`, async () => {
                market = market.connect(randomAccount);

                await expect(market.cancel(orderId)).to.be.rejectedWith('Market: incorrect seller');
            });
        });

        describe(`method 'reject'`, () => {
            beforeEach(() => {
                market = market.connect(owner);
            });

            shouldBehaveLikeCancel((orderId: string, from: SignerWithAddress) =>
                market.reject(orderId)
            );

            it('should cancel order if caller is owner', async () => {
                await market.reject(orderId);

                const order = await market.order(orderId);

                expect(order.status).equal(OrderStatus.Cancelled);
            });

            it(`should fail if caller is random account`, async () => {
                market = market.connect(randomAccount);

                await expect(market.reject(orderId)).to.be.rejectedWith(
                    'Ownable: caller is not the owner'
                );
            });
        });

        function shouldBehaveLikeCancel(
            method: (orderId: string, from: SignerWithAddress) => Promise<ContractTransaction>
        ) {
            it(`should transfer token back to seller`, async () => {
                await expect(method(orderId, tokenOwner))
                    .to.be.emit(collectionMock, 'Transfer')
                    .withArgs(market.address, tokenOwner.address, tokenId);
                await expect(collectionMock.ownerOf(tokenId)).to.be.eventually.equal(
                    tokenOwner.address
                );
            });

            it(`should emit Cancelled event`, async () => {
                await expect(method(orderId, tokenOwner))
                    .to.be.emit(market, 'Cancelled')
                    .withArgs(orderId, tokenId, tokenOwner.address);
            });

            it(`should change order status to Cancelled`, async () => {
                await method(orderId, tokenOwner);

                const order = await market.order(orderId);

                expect(order.status).equal(OrderStatus.Cancelled);
            });

            it(`should fail if order doesn't exist`, async () => {
                await expect(method('1111', tokenOwner)).to.be.rejectedWith(
                    'BaseMarket: order is not placed'
                );
            });

            it(`should fail if order is already cancelled`, async () => {
                await method(orderId, tokenOwner);

                await expect(method(orderId, tokenOwner)).to.be.rejectedWith(
                    'BaseMarket: order is not placed'
                );
            });

            it(`should fail if order is bought`, async () => {
                await market.connect(buyer).buy(orderId, { value: price });

                await expect(method(orderId, tokenOwner)).to.be.rejectedWith(
                    'Market: order is not placed'
                );
            });
        }
    });
});
