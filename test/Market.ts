import { ethers } from 'hardhat';
import { expect } from 'chai';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { deployUpgradeable } from '../scripts/deploy-upgradable';
import { Market, CollectionMock } from '../typechain-types';
import { OrderTypedDataInterface, signMarketOrder } from '../scripts/eip712';
import { deployClassic } from '../scripts/deploy-classic';

describe('Market', function () {
    let market: Market;
    let collectionMock: CollectionMock;
    let collectionBaseUri: string;

    let owner: SignerWithAddress;
    let orderSigner: SignerWithAddress;
    let tokenOwner: SignerWithAddress;
    let buyer: SignerWithAddress;
    let randomAccount: SignerWithAddress;

    enum OrderStatus {
        Placed = 0,
        Bought = 1,
        Cancelled = 2,
    }

    before(async () => {
        [owner, orderSigner, tokenOwner, buyer, randomAccount] = <SignerWithAddress[]>(
            await ethers.getSigners()
        );
    });

    beforeEach(async () => {
        collectionBaseUri = 'https://base-uri-mock/';
        collectionMock = <CollectionMock>await deployClassic({
            contractName: 'CollectionMock',
            constructorArgs: [collectionBaseUri],
            signer: owner,
        });
        collectionMock = collectionMock.connect(owner);

        const { proxyWithImpl } = await deployUpgradeable({
            contractName: 'Market',
            proxyAdminAddress: '0x0000000000000000000000000000000000000001',
            initializeArgs: [collectionMock.address, orderSigner.address],
            signer: owner,
        });

        market = <Market>proxyWithImpl;
        market = market.connect(owner);
    });

    it(`should have correct order signer`, async () => {
        await expect(market['orderSigner()']()).to.eventually.equal(orderSigner.address);
    });

    it(`should have correct collection`, async () => {
        await expect(market.collection()).to.eventually.equal(collectionMock.address);
    });

    it(`should have correct order count`, async () => {
        const orderCount = await market.orderCount();

        expect(orderCount.toString()).equal('0');
    });

    it(`owner can change order signer`, async () => {
        await market['orderSigner(address)'](randomAccount.address);

        await expect(market['orderSigner()']()).to.eventually.equal(randomAccount.address);
    });

    it(`random account can't change orderSigner`, async () => {
        market = market.connect(randomAccount);

        await expect(market['orderSigner(address)'](randomAccount.address)).to.be.rejectedWith(
            'Ownable: caller is not the owner'
        );
    });

    describe(`method 'place'`, () => {
        let tokenId: string;

        beforeEach(async () => {
            tokenId = '11';

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

            const orderTypedData: OrderTypedDataInterface = {
                ...order,
                nonce: '0',
            };

            const signature = await signMarketOrder(orderSigner, market.address, orderTypedData);

            await market.place(
                order.seller,
                order.tokenId,
                order.price,
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
            const order = {
                seller: tokenOwner.address,
                tokenId,
                price: '100000',
                participants: [owner.address, tokenOwner.address],
                shares: ['50000', '50000'],
            };

            const orderTypedData: OrderTypedDataInterface = {
                ...order,
                nonce: '0',
            };

            const signature = await signMarketOrder(orderSigner, market.address, orderTypedData);

            await expect(
                market.place(
                    order.seller,
                    order.tokenId,
                    order.price,
                    order.participants,
                    order.shares,
                    signature
                )
            )
                .to.emit(market, 'Placed')
                .withArgs(tokenId, tokenOwner.address, order.price);
        });

        it(`should increase nonce for token for sale`, async () => {
            const order = {
                seller: tokenOwner.address,
                tokenId,
                price: '100000',
                participants: [owner.address, tokenOwner.address],
                shares: ['50000', '50000'],
            };

            const nonce = await market.nonces(tokenId);

            const orderTypedData: OrderTypedDataInterface = {
                ...order,
                nonce: nonce.toString(),
            };

            const signature = await signMarketOrder(orderSigner, market.address, orderTypedData);

            await market.place(
                order.seller,
                order.tokenId,
                order.price,
                order.participants,
                order.shares,
                signature
            );

            await expect(market.nonces(tokenId)).to.eventually.equal(nonce.add(1));
        });

        it(`should increase order count`, async () => {
            const order = {
                seller: tokenOwner.address,
                tokenId,
                price: '100000',
                participants: [owner.address, tokenOwner.address],
                shares: ['50000', '50000'],
            };

            const orderTypedData: OrderTypedDataInterface = {
                ...order,
                nonce: '0',
            };

            const signature = await signMarketOrder(orderSigner, market.address, orderTypedData);

            await market.place(
                order.seller,
                order.tokenId,
                order.price,
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

            const orderTypedData: OrderTypedDataInterface = {
                ...order,
                nonce: '0',
            };

            const signature = await signMarketOrder(orderSigner, market.address, orderTypedData);

            await expect(
                market.place(
                    order.seller,
                    order.tokenId,
                    order.price,
                    order.participants,
                    order.shares,
                    signature
                )
            )
                .to.be.emit(collectionMock, 'Transfer')
                .withArgs(tokenOwner.address, market.address, tokenId);
            await expect(collectionMock.ownerOf(tokenId)).to.eventually.equal(market.address);
        });

        it(`should should fail if nonce is incorrect`, async () => {
            const order = {
                seller: tokenOwner.address,
                tokenId,
                price: '100000',
                participants: [owner.address, tokenOwner.address],
                shares: ['50000', '50000'],
            };

            const orderTypedData: OrderTypedDataInterface = {
                ...order,
                nonce: '1',
            };

            const signature = await signMarketOrder(orderSigner, market.address, orderTypedData);

            await expect(
                market.place(
                    order.seller,
                    order.tokenId,
                    order.price,
                    order.participants,
                    order.shares,
                    signature
                )
            ).to.be.rejectedWith('Market: invalid signature');
        });

        it(`should should fail if number of participants isn't equal number of shares`, async () => {
            const order = {
                seller: tokenOwner.address,
                tokenId,
                price: '100000',
                participants: [owner.address, tokenOwner.address],
                shares: ['100000'],
            };

            const orderTypedData: OrderTypedDataInterface = {
                ...order,
                nonce: '0',
            };

            const signature = await signMarketOrder(orderSigner, market.address, orderTypedData);

            await expect(
                market.place(
                    order.seller,
                    order.tokenId,
                    order.price,
                    order.participants,
                    order.shares,
                    signature
                )
            ).to.be.rejectedWith('Market: invalid order');
        });

        it(`should should fail if total shares isn't equal price`, async () => {
            const order = {
                seller: tokenOwner.address,
                tokenId,
                price: '100000',
                participants: [owner.address, tokenOwner.address],
                shares: ['50000', '40000'],
            };

            const orderTypedData: OrderTypedDataInterface = {
                ...order,
                nonce: '0',
            };

            const signature = await signMarketOrder(orderSigner, market.address, orderTypedData);

            await expect(
                market.place(
                    order.seller,
                    order.tokenId,
                    order.price,
                    order.participants,
                    order.shares,
                    signature
                )
            ).to.be.rejectedWith('Market: invalid order');
        });

        it(`should should fail if order signer is invalid`, async () => {
            const order = {
                seller: tokenOwner.address,
                tokenId,
                price: '100000',
                participants: [owner.address, tokenOwner.address],
                shares: ['50000', '40000'],
            };

            const orderTypedData: OrderTypedDataInterface = {
                ...order,
                nonce: '0',
            };

            const signature = await signMarketOrder(randomAccount, market.address, orderTypedData);

            await expect(
                market.place(
                    order.seller,
                    order.tokenId,
                    order.price,
                    order.participants,
                    order.shares,
                    signature
                )
            ).to.be.rejectedWith('Market: invalid signature');
        });

        it(`should should fail if token owner is incorrect`, async () => {
            const order = {
                seller: randomAccount.address,
                tokenId,
                price: '100000',
                participants: [owner.address, randomAccount.address],
                shares: ['50000', '50000'],
            };

            const orderTypedData: OrderTypedDataInterface = {
                ...order,
                nonce: '0',
            };

            const signature = await signMarketOrder(orderSigner, market.address, orderTypedData);

            market = market.connect(randomAccount);

            await expect(
                market.place(
                    order.seller,
                    order.tokenId,
                    order.price,
                    order.participants,
                    order.shares,
                    signature
                )
            ).to.be.rejectedWith('ERC721: transfer from incorrect owner');
        });

        it(`should should fail if token doesn't exist`, async () => {
            const order = {
                seller: tokenOwner.address,
                tokenId: '1234',
                price: '100000',
                participants: [owner.address, tokenOwner.address],
                shares: ['50000', '50000'],
            };

            const orderTypedData: OrderTypedDataInterface = {
                ...order,
                nonce: '0',
            };

            const signature = await signMarketOrder(orderSigner, market.address, orderTypedData);

            await expect(
                market.place(
                    order.seller,
                    order.tokenId,
                    order.price,
                    order.participants,
                    order.shares,
                    signature
                )
            ).to.be.rejectedWith('ERC721: invalid token ID');
        });

        it(`should should fail if token owner didn't approve for market contract`, async () => {
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

            const orderTypedData: OrderTypedDataInterface = {
                ...order,
                nonce: '0',
            };

            const signature = await signMarketOrder(orderSigner, market.address, orderTypedData);

            await expect(
                market.place(
                    order.seller,
                    order.tokenId,
                    order.price,
                    order.participants,
                    order.shares,
                    signature
                )
            ).to.be.rejectedWith('ERC721: caller is not token owner or approved');
        });
    });

    describe(`method 'buy'`, () => {
        let tokenId: string;
        let price: string;
        let participants: string[];
        let shares: string[];
        let orderId: string;

        beforeEach(async () => {
            tokenId = '11';
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

            const signature = await signMarketOrder(orderSigner, market.address, {
                ...order,
                nonce: '0',
            });

            await market.place(
                order.seller,
                order.tokenId,
                order.price,
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

            await expect(market.statuses(orderId)).to.be.eventually.equal(OrderStatus.Bought);
        });

        it(`should emit Bought event`, async () => {
            await expect(market.buy(orderId, { value: price }))
                .to.be.emit(market, 'Bought')
                .withArgs(tokenId, tokenOwner.address, buyer.address, price);
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
                'Market: order does not exist'
            );
        });
    });

    describe(`method 'cancel'`, () => {
        let tokenId: string;
        let price: string;
        let orderId: string;

        beforeEach(async () => {
            tokenId = '13';
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

            const signature = await signMarketOrder(orderSigner, market.address, {
                ...order,
                nonce: '0',
            });

            await market.place(
                order.seller,
                order.tokenId,
                order.price,
                order.participants,
                order.shares,
                signature
            );
        });

        it(`should transfer token back to seller`, async () => {
            await expect(market.cancel(orderId))
                .to.be.emit(collectionMock, 'Transfer')
                .withArgs(market.address, tokenOwner.address, tokenId);
            await expect(collectionMock.ownerOf(tokenId)).to.be.eventually.equal(
                tokenOwner.address
            );
        });

        it(`should emit Cancelled event`, async () => {
            await expect(market.cancel(orderId))
                .to.be.emit(market, 'Cancelled')
                .withArgs(tokenId, tokenOwner.address);
        });

        it(`should change order status to Cancelled`, async () => {
            await market.cancel(orderId);

            await expect(market.statuses(orderId)).to.be.eventually.equal(OrderStatus.Cancelled);
        });

        it(`should change order status to Cancelled`, async () => {
            await market.cancel(orderId);

            await expect(market.statuses(orderId)).to.be.eventually.equal(OrderStatus.Cancelled);
        });

        it(`should cancel and transfer token to token owner if caller is contract owner`, async () => {
            market = market.connect(owner);

            await expect(market.cancel(orderId))
                .to.be.emit(collectionMock, 'Transfer')
                .withArgs(market.address, tokenOwner.address, tokenId);

            await expect(market.statuses(orderId)).to.be.eventually.equal(OrderStatus.Cancelled);
        });

        it(`should fail if caller is random account`, async () => {
            market = market.connect(randomAccount);

            await expect(market.cancel(orderId)).to.be.rejectedWith('Market: invalid caller');
        });

        it(`should fail if order doesn't exist`, async () => {
            await expect(market.cancel('1111')).to.be.rejectedWith('Market: order does not exist');
        });

        it(`should fail if order is already cancelled`, async () => {
            await market.cancel(orderId);

            await expect(market.cancel(orderId)).to.be.rejectedWith('Market: order is not placed');
        });

        it(`should fail if order is bought`, async () => {
            market = market.connect(randomAccount);

            await market.connect(randomAccount).buy(orderId, { value: price });

            market = market.connect(tokenOwner);

            await expect(market.cancel(orderId)).to.be.rejectedWith('Market: order is not placed');
        });
    });
});
