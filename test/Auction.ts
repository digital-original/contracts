import { ethers } from 'hardhat';
import { BigNumber } from 'ethers';
import { mineUpTo } from '@nomicfoundation/hardhat-network-helpers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { deployClassic } from '../scripts/deploy-classic';
import { deployUpgradeable } from '../scripts/deploy-upgradable';
import { OrderTypedDataInterface, signAuctionOrder } from '../scripts/eip712';
import { Auction, CollectionMock, WhiteList } from '../typechain-types';

describe('Auction', function () {
    let auction: Auction;
    let whiteList: WhiteList;
    let collectionMock: CollectionMock;
    let collectionBaseUri: string;

    let owner: SignerWithAddress;
    let marketSigner: SignerWithAddress;
    let tokenOwner: SignerWithAddress;
    let buyer1: SignerWithAddress;
    let buyer2: SignerWithAddress;
    let randomAccount: SignerWithAddress;

    enum OrderStatus {
        NotExists,
        Placed,
        Ended,
        Cancelled,
    }

    before(async () => {
        [owner, marketSigner, tokenOwner, buyer1, buyer2, randomAccount] = <SignerWithAddress[]>(
            await ethers.getSigners()
        );

        collectionBaseUri = 'https://base-uri-mock/';
        collectionMock = <CollectionMock>await deployClassic({
            contractName: 'CollectionMock',
            constructorArgs: [collectionBaseUri],
            signer: owner,
        });

        const { proxyWithImpl: _whiteList } = await deployUpgradeable({
            contractName: 'WhiteList',
            proxyAdminAddress: '0x0000000000000000000000000000000000000001',
            initializeArgs: [],
            signer: owner,
        });

        whiteList = <WhiteList>_whiteList;

        await whiteList.add(buyer1.address);
        await whiteList.add(buyer2.address);
        await whiteList.add(tokenOwner.address);
    });

    beforeEach(async () => {
        const { proxyWithImpl } = await deployUpgradeable({
            contractName: 'Auction',
            proxyAdminAddress: '0x0000000000000000000000000000000000000001',
            initializeArgs: [collectionMock.address, marketSigner.address, whiteList.address],
            signer: owner,
        });

        auction = <Auction>proxyWithImpl;

        collectionMock = collectionMock.connect(owner);
        whiteList = whiteList.connect(owner);
        auction = auction.connect(owner);
    });

    it(`should have correct market signer`, async () => {
        await expect(auction['marketSigner()']()).to.eventually.equal(marketSigner.address);
    });

    it(`should have correct collection`, async () => {
        await expect(auction.collection()).to.eventually.equal(collectionMock.address);
    });

    it(`should have correct order count`, async () => {
        const orderCount = await auction.orderCount();

        expect(orderCount.toString()).equal('0');
    });

    it(`owner can change market signer`, async () => {
        await auction['marketSigner(address)'](randomAccount.address);

        await expect(auction['marketSigner()']()).to.eventually.equal(randomAccount.address);
    });

    it(`random account can't change market signer`, async () => {
        auction = auction.connect(randomAccount);

        await expect(auction['marketSigner(address)'](randomAccount.address)).to.be.rejectedWith(
            'Ownable: caller is not the owner'
        );
    });

    describe(`method 'place'`, () => {
        let tokenId: string;

        beforeEach(async () => {
            tokenId = (await collectionMock.totalSupply()).toString();

            auction = auction.connect(tokenOwner);
            collectionMock = collectionMock.connect(tokenOwner);

            await collectionMock.mint(tokenOwner.address, tokenId);
            await collectionMock.approve(auction.address, tokenId);
        });

        it(`should place order if data and signature are valid`, async () => {
            const blockNumber = await ethers.provider.getBlockNumber();

            const order = {
                seller: tokenOwner.address,
                tokenId,
                endBlock: blockNumber + 100,
                priceStep: 100,
                price: '100000',
                participants: [owner.address, tokenOwner.address],
                shares: ['50000', '50000'],
            };

            const expiredBlock = blockNumber + 10;

            const orderTypedData: OrderTypedDataInterface = { ...order, expiredBlock };

            const signature = await signAuctionOrder(marketSigner, auction.address, orderTypedData);

            await auction.place(
                order.tokenId,
                order.price,
                order.endBlock,
                order.priceStep,
                expiredBlock,
                order.participants,
                order.shares,
                signature
            );

            const placedOrder = await auction.order(0);

            expect(placedOrder.seller).equal(tokenOwner.address);
            expect(placedOrder.tokenId.toString()).equal(order.tokenId);
            expect(placedOrder.price.toString()).equal(order.price);
            expect(placedOrder.status).equal(OrderStatus.Placed);
        });

        it(`should emit Placed event`, async () => {
            const orderId = '0';

            const blockNumber = await ethers.provider.getBlockNumber();

            const order = {
                seller: tokenOwner.address,
                tokenId,
                endBlock: blockNumber + 100,
                priceStep: 100,
                price: '100000',
                participants: [owner.address, tokenOwner.address],
                shares: ['50000', '50000'],
            };

            const expiredBlock = blockNumber + 10;

            const orderTypedData: OrderTypedDataInterface = { ...order, expiredBlock };

            const signature = await signAuctionOrder(marketSigner, auction.address, orderTypedData);

            await expect(
                auction.place(
                    order.tokenId,
                    order.price,
                    order.endBlock,
                    order.priceStep,
                    expiredBlock,
                    order.participants,
                    order.shares,
                    signature
                )
            )
                .to.emit(auction, 'Placed')
                .withArgs(orderId, tokenId, tokenOwner.address, order.price);
        });

        it(`should increase order count`, async () => {
            const blockNumber = await ethers.provider.getBlockNumber();

            const order = {
                seller: tokenOwner.address,
                tokenId,
                endBlock: blockNumber + 100,
                priceStep: 100,
                price: '100000',
                participants: [owner.address, tokenOwner.address],
                shares: ['50000', '50000'],
            };

            const expiredBlock = blockNumber + 10;

            const orderTypedData: OrderTypedDataInterface = { ...order, expiredBlock };

            const signature = await signAuctionOrder(marketSigner, auction.address, orderTypedData);

            await auction.place(
                order.tokenId,
                order.price,
                order.endBlock,
                order.priceStep,
                expiredBlock,
                order.participants,
                order.shares,
                signature
            );

            const orderCount = await auction.orderCount();

            expect(orderCount.toString()).equal('1');
        });

        it(`should transfer token to Auction`, async () => {
            const blockNumber = await ethers.provider.getBlockNumber();

            const order = {
                seller: tokenOwner.address,
                tokenId,
                endBlock: blockNumber + 100,
                priceStep: 100,
                price: '100000',
                participants: [owner.address, tokenOwner.address],
                shares: ['50000', '50000'],
            };

            const expiredBlock = blockNumber + 10;

            const orderTypedData: OrderTypedDataInterface = { ...order, expiredBlock };

            const signature = await signAuctionOrder(marketSigner, auction.address, orderTypedData);

            await expect(
                auction.place(
                    order.tokenId,
                    order.price,
                    order.endBlock,
                    order.priceStep,
                    expiredBlock,
                    order.participants,
                    order.shares,
                    signature
                )
            )
                .to.be.emit(collectionMock, 'Transfer')
                .withArgs(tokenOwner.address, auction.address, tokenId);
            await expect(collectionMock.ownerOf(tokenId)).to.eventually.equal(auction.address);
        });

        it(`should fail if expired block number less than current`, async () => {
            const blockNumber = await ethers.provider.getBlockNumber();

            const order = {
                seller: tokenOwner.address,
                tokenId,
                endBlock: blockNumber + 100,
                priceStep: 100,
                price: '100000',
                participants: [owner.address, tokenOwner.address],
                shares: ['50000', '50000'],
            };

            const expiredBlock = blockNumber + 10;

            const orderTypedData: OrderTypedDataInterface = { ...order, expiredBlock };

            const signature = await signAuctionOrder(marketSigner, auction.address, orderTypedData);

            await mineUpTo(expiredBlock + 1);

            await expect(
                auction.place(
                    order.tokenId,
                    order.price,
                    order.endBlock,
                    order.priceStep,
                    expiredBlock,
                    order.participants,
                    order.shares,
                    signature
                )
            ).to.be.rejectedWith('Auction: unauthorized');
        });

        it(`should fail if number of participants isn't equal number of shares`, async () => {
            const blockNumber = await ethers.provider.getBlockNumber();

            const order = {
                seller: tokenOwner.address,
                tokenId,
                endBlock: blockNumber + 100,
                priceStep: 100,
                price: '100000',
                participants: [owner.address, tokenOwner.address],
                shares: ['100000'],
            };

            const expiredBlock = blockNumber + 10;

            const orderTypedData: OrderTypedDataInterface = { ...order, expiredBlock };

            const signature = await signAuctionOrder(marketSigner, auction.address, orderTypedData);

            await expect(
                auction.place(
                    order.tokenId,
                    order.price,
                    order.endBlock,
                    order.priceStep,
                    expiredBlock,
                    order.participants,
                    order.shares,
                    signature
                )
            ).to.be.rejectedWith('Auction: invalid price');
        });

        it(`should fail if total shares isn't equal price`, async () => {
            const blockNumber = await ethers.provider.getBlockNumber();

            const order = {
                seller: tokenOwner.address,
                tokenId,
                endBlock: blockNumber + 100,
                priceStep: 100,
                price: '100000',
                participants: [owner.address, tokenOwner.address],
                shares: ['50000', '40000'],
            };

            const expiredBlock = blockNumber + 10;

            const orderTypedData: OrderTypedDataInterface = { ...order, expiredBlock };

            const signature = await signAuctionOrder(marketSigner, auction.address, orderTypedData);

            await expect(
                auction.place(
                    order.tokenId,
                    order.price,
                    order.endBlock,
                    order.priceStep,
                    expiredBlock,
                    order.participants,
                    order.shares,
                    signature
                )
            ).to.be.rejectedWith('Auction: invalid price');
        });

        it(`should fail if market signer is invalid`, async () => {
            const blockNumber = await ethers.provider.getBlockNumber();

            const order = {
                seller: tokenOwner.address,
                tokenId,
                endBlock: blockNumber + 100,
                priceStep: 100,
                price: '100000',
                participants: [owner.address, tokenOwner.address],
                shares: ['50000', '50000'],
            };

            const expiredBlock = blockNumber + 10;

            const orderTypedData: OrderTypedDataInterface = { ...order, expiredBlock };

            const signature = await signAuctionOrder(
                randomAccount,
                auction.address,
                orderTypedData
            );

            await expect(
                auction.place(
                    order.tokenId,
                    order.price,
                    order.endBlock,
                    order.priceStep,
                    expiredBlock,
                    order.participants,
                    order.shares,
                    signature
                )
            ).to.be.rejectedWith('Auction: unauthorized');
        });

        it(`should fail if token owner is incorrect`, async () => {
            const blockNumber = await ethers.provider.getBlockNumber();

            const order = {
                seller: randomAccount.address,
                tokenId,
                endBlock: blockNumber + 100,
                priceStep: 100,
                price: '100000',
                participants: [owner.address, tokenOwner.address],
                shares: ['50000', '50000'],
            };

            const expiredBlock = blockNumber + 10;

            const orderTypedData: OrderTypedDataInterface = { ...order, expiredBlock };

            const signature = await signAuctionOrder(marketSigner, auction.address, orderTypedData);

            auction = auction.connect(randomAccount);

            await expect(
                auction.place(
                    order.tokenId,
                    order.price,
                    order.endBlock,
                    order.priceStep,
                    expiredBlock,
                    order.participants,
                    order.shares,
                    signature
                )
            ).to.be.rejectedWith('ERC721: transfer from incorrect owner');
        });

        it(`should fail if token doesn't exist`, async () => {
            const blockNumber = await ethers.provider.getBlockNumber();

            const order = {
                seller: tokenOwner.address,
                tokenId: '1234',
                endBlock: blockNumber + 100,
                priceStep: 100,
                price: '100000',
                participants: [owner.address, tokenOwner.address],
                shares: ['50000', '50000'],
            };

            const expiredBlock = blockNumber + 10;

            const orderTypedData: OrderTypedDataInterface = { ...order, expiredBlock };

            const signature = await signAuctionOrder(marketSigner, auction.address, orderTypedData);

            await expect(
                auction.place(
                    order.tokenId,
                    order.price,
                    order.endBlock,
                    order.priceStep,
                    expiredBlock,
                    order.participants,
                    order.shares,
                    signature
                )
            ).to.be.rejectedWith('ERC721: invalid token ID');
        });

        it(`should fail if token owner didn't approve token transfer for auction contract`, async () => {
            await collectionMock.transferFrom(tokenOwner.address, randomAccount.address, tokenId);

            [tokenOwner, randomAccount] = [randomAccount, tokenOwner];

            auction = auction.connect(tokenOwner);
            collectionMock = collectionMock.connect(tokenOwner);

            const blockNumber = await ethers.provider.getBlockNumber();

            const order = {
                seller: tokenOwner.address,
                tokenId,
                endBlock: blockNumber + 100,
                priceStep: 100,
                price: '100000',
                participants: [owner.address, tokenOwner.address],
                shares: ['50000', '50000'],
            };

            const expiredBlock = blockNumber + 10;

            const orderTypedData: OrderTypedDataInterface = { ...order, expiredBlock };

            const signature = await signAuctionOrder(marketSigner, auction.address, orderTypedData);

            await expect(
                auction.place(
                    order.tokenId,
                    order.price,
                    order.endBlock,
                    order.priceStep,
                    expiredBlock,
                    order.participants,
                    order.shares,
                    signature
                )
            ).to.be.rejectedWith('ERC721: caller is not token owner or approved');

            [tokenOwner, randomAccount] = [randomAccount, tokenOwner];
        });

        it(`should fail if end block isn't more than current`, async () => {
            const blockNumber = await ethers.provider.getBlockNumber();

            const endBlock = blockNumber + 5;

            const order = {
                seller: tokenOwner.address,
                tokenId,
                endBlock,
                priceStep: 100,
                price: '100000',
                participants: [owner.address, tokenOwner.address],
                shares: ['50000', '50000'],
            };

            const expiredBlock = blockNumber + 10;

            const orderTypedData: OrderTypedDataInterface = { ...order, expiredBlock };

            const signature = await signAuctionOrder(marketSigner, auction.address, orderTypedData);

            await mineUpTo(endBlock);

            await expect(
                auction.place(
                    order.tokenId,
                    order.price,
                    order.endBlock,
                    order.priceStep,
                    expiredBlock,
                    order.participants,
                    order.shares,
                    signature
                )
            ).to.be.rejectedWith('Auction: end block is less than current');
        });
    });

    describe(`method 'raise'`, () => {
        let tokenId: string;
        let price: number;
        let priceStep: number;
        let endBlock: number;
        let participants: string[];
        let shares: string[];
        let orderId: string;

        beforeEach(async () => {
            const blockNumber = await ethers.provider.getBlockNumber();

            tokenId = (await collectionMock.totalSupply()).toString();
            price = 100000;
            priceStep = 100;
            endBlock = blockNumber + 100;
            participants = [owner.address, tokenOwner.address];
            shares = ['50000', '50000'];
            orderId = '0';

            auction = auction.connect(tokenOwner);
            collectionMock = collectionMock.connect(tokenOwner);

            await collectionMock.mint(tokenOwner.address, tokenId);
            await collectionMock.approve(auction.address, tokenId);

            const order = {
                seller: tokenOwner.address,
                tokenId,
                endBlock,
                priceStep: '100',
                price: '100000',
                participants: [owner.address, tokenOwner.address],
                shares: ['50000', '50000'],
            };

            const expiredBlock = blockNumber + 10;

            const orderTypedData: OrderTypedDataInterface = { ...order, expiredBlock };

            const signature = await signAuctionOrder(marketSigner, auction.address, orderTypedData);

            await auction.place(
                order.tokenId,
                order.price,
                order.endBlock,
                order.priceStep,
                expiredBlock,
                order.participants,
                order.shares,
                signature
            );

            auction = auction.connect(buyer1);
            collectionMock = collectionMock.connect(buyer1);
        });

        it(`should raise order price`, async () => {
            price = price + priceStep;

            await auction.raise(orderId, { value: price });

            const order = await auction.order(orderId);

            expect(order.price.toNumber()).equal(price);
        });

        it(`should increase contract balance`, async () => {
            price = price + priceStep;

            await expect(() => auction.raise(orderId, { value: price })).to.be.changeEtherBalances(
                [buyer1.address, auction.address],
                [price * -1, price]
            );
        });

        it(`should set buyer`, async () => {
            price = price + priceStep;

            await auction.raise(orderId, { value: price });

            const order = await auction.order(orderId);

            expect(order.buyer).equal(buyer1.address);
        });

        it(`should change contract balance by price difference`, async () => {
            price = price + priceStep;

            await auction.raise(orderId, { value: price });

            auction = auction.connect(buyer2);

            const order = await auction.order(orderId);

            const newValue = order.price.toNumber() + priceStep;

            await expect(() =>
                auction.raise(orderId, { value: newValue })
            ).to.be.changeEtherBalances(
                [buyer2.address, auction.address],
                [newValue * -1, priceStep]
            );
        });

        it(`should change buyer`, async () => {
            price = price + priceStep;

            await auction.raise(orderId, { value: price });

            auction = auction.connect(buyer2);

            const order = await auction.order(orderId);

            price = order.price.toNumber() + priceStep;

            await auction.raise(orderId, { value: price });

            const updatedOrder = await auction.order(orderId);

            expect(updatedOrder.buyer).equal(buyer2.address);
        });

        it(`should send back ether to prev buyer`, async () => {
            price = price + priceStep;

            await auction.raise(orderId, { value: price });

            auction = auction.connect(buyer2);

            const order = await auction.order(orderId);

            price = order.price.toNumber() + priceStep;

            await expect(() => auction.raise(orderId, { value: price })).to.be.changeEtherBalances(
                [buyer2.address, auction.address, buyer1.address],
                [price * -1, priceStep, price - priceStep]
            );
        });

        it(`should emit Raised event`, async () => {
            price = price + priceStep;

            await expect(auction.raise(orderId, { value: price }))
                .to.be.emit(auction, 'Raised')
                .withArgs(orderId, tokenId, buyer1.address, tokenOwner.address, price);
        });

        it(`should fail if buyer isn't whitelisted`, async () => {
            price = price + priceStep;

            auction = auction.connect(randomAccount);

            await expect(auction.raise(orderId, { value: price })).to.be.rejectedWith(
                'BaseMarket: invalid caller'
            );
        });

        it(`should fail if order doesn't exist`, async () => {
            price = price + priceStep;

            await expect(auction.raise('1234', { value: price })).to.be.rejectedWith(
                'BaseMarket: order is not placed'
            );
        });

        it(`should fail if auction is ended`, async () => {
            price = price + priceStep;

            await mineUpTo(endBlock);

            await expect(auction.raise(orderId, { value: price })).to.be.rejectedWith(
                'Auction: auction is ended'
            );
        });

        it(`should fail if caller is seller`, async () => {
            price = price + priceStep;

            auction = auction.connect(tokenOwner);

            await expect(auction.raise(orderId, { value: price })).to.be.rejectedWith(
                'Auction: seller can not be buyer'
            );
        });

        it(`should fail if sent ether amount isn't enough `, async () => {
            price = price + priceStep - 1;

            await expect(auction.raise(orderId, { value: price })).to.be.rejectedWith(
                'Auction: invalid ether amount'
            );
        });
    });

    describe(`method 'end'`, () => {
        let tokenId: string;
        let price: number;
        let priceStep: number;
        let endBlock: number;
        let participants: string[];
        let shares: number[];
        let orderId: string;

        beforeEach(async () => {
            const blockNumber = await ethers.provider.getBlockNumber();

            tokenId = (await collectionMock.totalSupply()).toString();
            price = 91738;
            priceStep = 100;
            endBlock = blockNumber + 100;
            participants = [owner.address, tokenOwner.address, randomAccount.address];
            shares = [1234, 4567, 85937];
            orderId = '0';

            auction = auction.connect(tokenOwner);
            collectionMock = collectionMock.connect(tokenOwner);

            await collectionMock.mint(tokenOwner.address, tokenId);
            await collectionMock.approve(auction.address, tokenId);

            const order = {
                seller: tokenOwner.address,
                tokenId,
                endBlock,
                priceStep,
                price,
                participants,
                shares,
            };

            const expiredBlock = blockNumber + 10;

            const orderTypedData: OrderTypedDataInterface = { ...order, expiredBlock };

            const signature = await signAuctionOrder(marketSigner, auction.address, orderTypedData);

            await auction.place(
                order.tokenId,
                order.price,
                order.endBlock,
                order.priceStep,
                expiredBlock,
                order.participants,
                order.shares,
                signature
            );

            auction = auction.connect(buyer1);
            collectionMock = collectionMock.connect(buyer1);
        });

        it(`should fail if order doesn't exist`, async () => {
            await expect(auction.end('1234')).to.be.rejectedWith('BaseMarket: order is not placed');
        });

        it(`should fail if auction is still going`, async () => {
            await expect(auction.end(orderId)).to.be.rejectedWith(
                'Auction: auction is still going'
            );
        });

        it(`should emit Ended event`, async () => {
            await mineUpTo(endBlock);

            const order = await auction.order(orderId);

            await expect(auction.end(orderId))
                .to.be.emit(auction, 'Ended')
                .withArgs(orderId, tokenId, order.buyer, tokenOwner.address, price);
        });

        describe(`if buyer doesn't exist`, () => {
            beforeEach(async () => {
                await mineUpTo(endBlock);
            });

            it(`should transfer token back to seller`, async () => {
                await expect(auction.end(orderId))
                    .to.be.emit(collectionMock, 'Transfer')
                    .withArgs(auction.address, tokenOwner.address, tokenId);
                await expect(collectionMock.ownerOf(tokenId)).to.eventually.equal(
                    tokenOwner.address
                );
            });
        });

        describe(`if buyer exists`, () => {
            beforeEach(async () => {
                price = price + priceStep;

                await auction.raise(orderId, { value: price });

                await mineUpTo(endBlock);
            });

            it(`should transfer token to buyer`, async () => {
                await expect(auction.end(orderId))
                    .to.be.emit(collectionMock, 'Transfer')
                    .withArgs(auction.address, buyer1.address, tokenId);
                await expect(collectionMock.ownerOf(tokenId)).to.eventually.equal(buyer1.address);
            });

            it(`should distribute ETH between participants according to shares`, async () => {
                const lastShareIndex = shares.length - 1;
                const totalShares = shares.reduce((acc, a) => acc + a, 0);
                let released = BigNumber.from(0);

                for (let i = 0; i < lastShareIndex; i++) {
                    const value = BigNumber.from(shares[i]).mul(price).div(totalShares);

                    released = released.add(value);

                    shares[i] = value.toNumber();
                }

                shares[lastShareIndex] = BigNumber.from(price).sub(released).toNumber();

                await expect(() => auction.end(orderId)).to.be.changeEtherBalances(
                    [auction.address, ...participants],
                    [price * -1, ...shares]
                );
            });
        });
    });

    describe(`method 'reject'`, () => {
        let tokenId: string;
        let price: number;
        let priceStep: number;
        let endBlock: number;
        let participants: string[];
        let shares: string[];
        let orderId: string;

        beforeEach(async () => {
            const blockNumber = await ethers.provider.getBlockNumber();

            tokenId = (await collectionMock.totalSupply()).toString();
            price = 100000;
            priceStep = 100;
            endBlock = blockNumber + 100;
            participants = [owner.address, tokenOwner.address];
            shares = ['50000', '50000'];
            orderId = '0';

            auction = auction.connect(tokenOwner);
            collectionMock = collectionMock.connect(tokenOwner);

            await collectionMock.mint(tokenOwner.address, tokenId);
            await collectionMock.approve(auction.address, tokenId);

            const order = {
                seller: tokenOwner.address,
                tokenId,
                endBlock,
                priceStep: '100',
                price: '100000',
                participants: [owner.address, tokenOwner.address],
                shares: ['50000', '50000'],
            };

            const expiredBlock = blockNumber + 10;

            const orderTypedData: OrderTypedDataInterface = { ...order, expiredBlock };

            const signature = await signAuctionOrder(marketSigner, auction.address, orderTypedData);

            await auction.place(
                order.tokenId,
                order.price,
                order.endBlock,
                order.priceStep,
                expiredBlock,
                order.participants,
                order.shares,
                signature
            );

            auction = auction.connect(owner);
            collectionMock = collectionMock.connect(owner);
        });

        it('should cancel order if caller is owner', async () => {
            await auction.reject(orderId);

            const order = await auction.order(orderId);

            expect(order.status).equal(OrderStatus.Cancelled);
        });

        it(`should fail if caller is random account`, async () => {
            auction = auction.connect(randomAccount);

            await expect(auction.reject(orderId)).to.be.rejectedWith(
                'Ownable: caller is not the owner'
            );
        });

        it(`should transfer token back to seller`, async () => {
            await expect(auction.reject(orderId))
                .to.be.emit(collectionMock, 'Transfer')
                .withArgs(auction.address, tokenOwner.address, tokenId);
            await expect(collectionMock.ownerOf(tokenId)).to.be.eventually.equal(
                tokenOwner.address
            );
        });

        it(`should emit Cancelled event`, async () => {
            await expect(auction.reject(orderId))
                .to.be.emit(auction, 'Cancelled')
                .withArgs(orderId, tokenId, tokenOwner.address);
        });

        it(`should change order status to Cancelled`, async () => {
            await auction.reject(orderId);

            const order = await auction.order(orderId);

            expect(order.status).equal(OrderStatus.Cancelled);
        });

        it(`should fail if order doesn't exist`, async () => {
            await expect(auction.reject('1111')).to.be.rejectedWith(
                'BaseMarket: order is not placed'
            );
        });

        it(`should fail if order is already cancelled`, async () => {
            await auction.reject(orderId);

            await expect(auction.reject(orderId)).to.be.rejectedWith(
                'BaseMarket: order is not placed'
            );
        });

        it(`should fail if auction is already ended`, async () => {
            price = price + priceStep;

            await auction.connect(buyer1).raise(orderId, { value: price });

            await mineUpTo(endBlock);

            await auction.end(orderId);

            await expect(auction.reject(orderId)).to.be.rejectedWith(
                'BaseMarket: order is not placed'
            );
        });

        it(`should send ether back to buyer if buyer exits`, async () => {
            price = price + priceStep;

            await auction.connect(buyer1).raise(orderId, { value: price });

            await expect(() => auction.reject(orderId)).to.be.changeEtherBalances(
                [auction.address, buyer1.address],
                [price * -1, price]
            );
        });
    });
});
