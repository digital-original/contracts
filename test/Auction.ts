// import { ethers } from 'hardhat';
// import { AbiCoder, Signer } from 'ethers';
// import { setNextBlockTimestamp } from '@nomicfoundation/hardhat-network-helpers/dist/src/helpers/time';
// import { expect } from 'chai';
// import { deployClassic } from '../src/scripts/deploy-classic';
// import { deployUpgradeable } from '../src/scripts/deploy-upgradable';
// import { signMarketOrder } from '../src/scripts/eip712';
// import { Auction, TokenMock } from '../typechain-types';
// import { OrderStruct } from '../src/typedefs';

// describe('Auction', function () {
//     let auction: Auction;

//     let tokenMock: TokenMock;

//     let tokenBaseUri: string;

//     let owner: SignerWithAddress;
//     let marketSigner: SignerWithAddress;
//     let tokenOwner: SignerWithAddress;
//     let buyer1: SignerWithAddress;
//     let buyer2: SignerWithAddress;
//     let randomAccount: SignerWithAddress;

//     enum OrderStatus {
//         NotExists,
//         Placed,
//         Ended,
//     }

//     before(async () => {
//         [owner, marketSigner, tokenOwner, buyer1, buyer2, randomAccount] = <SignerWithAddress[]>(
//             await ethers.getSigners()
//         );

//         tokenBaseUri = 'https://base-uri-mock/';
//         tokenMock = <TokenMock>await deployClassic({
//             contractName: 'TokenMock',
//             constructorArgs: [tokenBaseUri],
//             signer: owner,
//         });
//     });

//     beforeEach(async () => {
//         const { proxyWithImpl } = await deployUpgradeable({
//             contractName: 'Auction',
//             proxyAdminAddress: '0x0000000000000000000000000000000000000001',
//             constructorArgs: [tokenMock.address, marketSigner.address],
//             initializeArgs: [],
//             signer: owner,
//         });

//         auction = <Auction>proxyWithImpl;

//         tokenMock = tokenMock.connect(owner);
//         auction = auction.connect(owner);
//     });

//     it(`should have correct collection`, async () => {
//         await expect(auction.collection()).to.eventually.equal(tokenMock.address);
//     });

//     it(`should have correct market signer`, async () => {
//         await expect(auction.marketSigner()).to.eventually.equal(marketSigner.address);
//     });

//     it(`should have correct order count`, async () => {
//         const orderCount = await auction.orderCount();

//         expect(orderCount.toString()).equal('0');
//     });

//     function safeTransferFrom(
//         from: string,
//         tokenId: string,
//         price: string | number,
//         endBlock: string | number,
//         priceStep: string | number,
//         expiredBlock: string | number,
//         participants: string[],
//         shares: (string | number)[],
//         signature: string
//     ) {
//         return tokenMock['safeTransferFrom(address,address,uint256,bytes)'](
//             from,
//             auction.address,
//             tokenId,
//             ethers.utils.defaultAbiCoder.encode(
//                 ['uint256', 'uint256', 'uint256', 'uint256', 'address[]', 'uint256[]', 'bytes'],
//                 [price, endBlock, priceStep, expiredBlock, participants, shares, signature]
//             )
//         );
//     }

//     describe(`method 'onERC721Received'`, () => {
//         let tokenId: string;

//         beforeEach(async () => {
//             tokenId = (await tokenMock.totalSupply()).toString();

//             tokenMock = tokenMock.connect(tokenOwner);

//             await tokenMock.mint(tokenOwner.address, tokenId);
//         });

//         it(`should place order if data and signature are valid`, async () => {
//             const blockNumber = await ethers.provider.getBlockNumber();
//             const expiredBlock = blockNumber + 10;

//             const order = {
//                 seller: tokenOwner.address,
//                 tokenId,
//                 endBlock: blockNumber + 100,
//                 priceStep: 100,
//                 price: '100000',
//                 participants: [owner.address, tokenOwner.address],
//                 shares: ['50000', '50000'],
//                 expiredBlock,
//             };

//             const orderTypedData: OrderTypedDataInterface = { ...order };

//             const signature = await signAuctionOrder(marketSigner, auction.address, orderTypedData);

//             await safeTransferFrom(
//                 tokenOwner.address,
//                 tokenId,
//                 order.price,
//                 order.endBlock,
//                 order.priceStep,
//                 order.expiredBlock,
//                 order.participants,
//                 order.shares,
//                 signature
//             );

//             const placedOrder = await auction.order(0);

//             expect(placedOrder.seller).equal(tokenOwner.address);
//             expect(placedOrder.tokenId.toString()).equal(order.tokenId);
//             expect(placedOrder.price.toString()).equal(order.price);
//             expect(placedOrder.status).equal(OrderStatus.Placed);
//         });

//         it(`should emit Placed event`, async () => {
//             const orderId = '0';

//             const blockNumber = await ethers.provider.getBlockNumber();
//             const expiredBlock = blockNumber + 10;

//             const order = {
//                 seller: tokenOwner.address,
//                 tokenId,
//                 endBlock: blockNumber + 100,
//                 priceStep: 100,
//                 price: '100000',
//                 participants: [owner.address, tokenOwner.address],
//                 shares: ['50000', '50000'],
//                 expiredBlock,
//             };

//             const orderTypedData: OrderTypedDataInterface = { ...order };

//             const signature = await signAuctionOrder(marketSigner, auction.address, orderTypedData);

//             await expect(
//                 safeTransferFrom(
//                     tokenOwner.address,
//                     tokenId,
//                     order.price,
//                     order.endBlock,
//                     order.priceStep,
//                     order.expiredBlock,
//                     order.participants,
//                     order.shares,
//                     signature
//                 )
//             )
//                 .to.emit(auction, 'Placed')
//                 .withArgs(orderId, tokenId, tokenOwner.address, order.price);
//         });

//         it(`should increase order count`, async () => {
//             const blockNumber = await ethers.provider.getBlockNumber();
//             const expiredBlock = blockNumber + 10;

//             const order = {
//                 seller: tokenOwner.address,
//                 tokenId,
//                 endBlock: blockNumber + 100,
//                 priceStep: 100,
//                 price: '100000',
//                 participants: [owner.address, tokenOwner.address],
//                 shares: ['50000', '50000'],
//                 expiredBlock,
//             };

//             const orderTypedData: OrderTypedDataInterface = { ...order };

//             const signature = await signAuctionOrder(marketSigner, auction.address, orderTypedData);

//             await safeTransferFrom(
//                 tokenOwner.address,
//                 tokenId,
//                 order.price,
//                 order.endBlock,
//                 order.priceStep,
//                 order.expiredBlock,
//                 order.participants,
//                 order.shares,
//                 signature
//             );

//             const orderCount = await auction.orderCount();

//             expect(orderCount.toString()).equal('1');
//         });

//         it(`should fail if caller isn't collection contract`, async () => {
//             const blockNumber = await ethers.provider.getBlockNumber();
//             const expiredBlock = blockNumber + 10;

//             const order = {
//                 seller: tokenOwner.address,
//                 tokenId,
//                 endBlock: blockNumber + 100,
//                 priceStep: 100,
//                 price: '100000',
//                 participants: [owner.address, tokenOwner.address],
//                 shares: ['50000', '50000'],
//                 expiredBlock,
//             };

//             const orderTypedData: OrderTypedDataInterface = { ...order };

//             const signature = await signAuctionOrder(marketSigner, auction.address, orderTypedData);

//             await expect(
//                 auction.onERC721Received(
//                     tokenOwner.address,
//                     tokenOwner.address,
//                     tokenId,
//                     ethers.utils.defaultAbiCoder.encode(
//                         [
//                             'uint256',
//                             'uint256',
//                             'uint256',
//                             'uint256',
//                             'address[]',
//                             'uint256[]',
//                             'bytes',
//                         ],
//                         [
//                             order.price,
//                             order.endBlock,
//                             order.priceStep,
//                             order.expiredBlock,
//                             order.participants,
//                             order.shares,
//                             signature,
//                         ]
//                     )
//                 )
//             ).to.be.rejectedWith('BaseMarket: caller is not the collection');
//         });

//         it(`should fail if expired block number less than current`, async () => {
//             const blockNumber = await ethers.provider.getBlockNumber();
//             const expiredBlock = blockNumber + 10;

//             const order = {
//                 seller: tokenOwner.address,
//                 tokenId,
//                 endBlock: blockNumber + 100,
//                 priceStep: 100,
//                 price: '100000',
//                 participants: [owner.address, tokenOwner.address],
//                 shares: ['50000', '50000'],
//                 expiredBlock,
//             };

//             const orderTypedData: OrderTypedDataInterface = { ...order };

//             const signature = await signAuctionOrder(marketSigner, auction.address, orderTypedData);

//             await mineUpTo(expiredBlock + 1);

//             await expect(
//                 safeTransferFrom(
//                     tokenOwner.address,
//                     tokenId,
//                     order.price,
//                     order.endBlock,
//                     order.priceStep,
//                     order.expiredBlock,
//                     order.participants,
//                     order.shares,
//                     signature
//                 )
//             ).to.be.rejectedWith('MarketSigner: signature is expired');
//         });

//         it(`should fail if number of participants isn't equal number of shares`, async () => {
//             const blockNumber = await ethers.provider.getBlockNumber();
//             const expiredBlock = blockNumber + 10;

//             const order = {
//                 seller: tokenOwner.address,
//                 tokenId,
//                 endBlock: blockNumber + 100,
//                 priceStep: 100,
//                 price: '100000',
//                 participants: [owner.address, tokenOwner.address],
//                 shares: ['100000'],
//                 expiredBlock,
//             };

//             const orderTypedData: OrderTypedDataInterface = { ...order };

//             const signature = await signAuctionOrder(marketSigner, auction.address, orderTypedData);

//             await expect(
//                 safeTransferFrom(
//                     tokenOwner.address,
//                     tokenId,
//                     order.price,
//                     order.endBlock,
//                     order.priceStep,
//                     order.expiredBlock,
//                     order.participants,
//                     order.shares,
//                     signature
//                 )
//             ).to.be.rejectedWith('BaseMarket: number of shares is wrong');
//         });

//         it(`should fail if total shares isn't equal price`, async () => {
//             const blockNumber = await ethers.provider.getBlockNumber();
//             const expiredBlock = blockNumber + 10;

//             const order = {
//                 seller: tokenOwner.address,
//                 tokenId,
//                 endBlock: blockNumber + 100,
//                 priceStep: 100,
//                 price: '100000',
//                 participants: [owner.address, tokenOwner.address],
//                 shares: ['50000', '40000'],
//                 expiredBlock,
//             };

//             const orderTypedData: OrderTypedDataInterface = { ...order };

//             const signature = await signAuctionOrder(marketSigner, auction.address, orderTypedData);

//             await expect(
//                 safeTransferFrom(
//                     tokenOwner.address,
//                     tokenId,
//                     order.price,
//                     order.endBlock,
//                     order.priceStep,
//                     order.expiredBlock,
//                     order.participants,
//                     order.shares,
//                     signature
//                 )
//             ).to.be.rejectedWith('BaseMarket: price is not equal sum of shares');
//         });

//         it(`should fail if market signer is invalid`, async () => {
//             const blockNumber = await ethers.provider.getBlockNumber();
//             const expiredBlock = blockNumber + 10;

//             const order = {
//                 seller: tokenOwner.address,
//                 tokenId,
//                 endBlock: blockNumber + 100,
//                 priceStep: 100,
//                 price: '100000',
//                 participants: [owner.address, tokenOwner.address],
//                 shares: ['50000', '50000'],
//                 expiredBlock,
//             };

//             const orderTypedData: OrderTypedDataInterface = { ...order };

//             const signature = await signAuctionOrder(
//                 randomAccount,
//                 auction.address,
//                 orderTypedData
//             );

//             await expect(
//                 safeTransferFrom(
//                     tokenOwner.address,
//                     tokenId,
//                     order.price,
//                     order.endBlock,
//                     order.priceStep,
//                     order.expiredBlock,
//                     order.participants,
//                     order.shares,
//                     signature
//                 )
//             ).to.be.rejectedWith('MarketSigner: unauthorized');
//         });

//         it(`should fail if end block isn't more than current`, async () => {
//             const blockNumber = await ethers.provider.getBlockNumber();
//             const expiredBlock = blockNumber + 10;
//             const endBlock = blockNumber + 5;

//             const order = {
//                 seller: tokenOwner.address,
//                 tokenId,
//                 endBlock,
//                 priceStep: 100,
//                 price: '100000',
//                 participants: [owner.address, tokenOwner.address],
//                 shares: ['50000', '50000'],
//                 expiredBlock,
//             };

//             const orderTypedData: OrderTypedDataInterface = { ...order };

//             const signature = await signAuctionOrder(marketSigner, auction.address, orderTypedData);

//             await mineUpTo(endBlock);

//             await expect(
//                 safeTransferFrom(
//                     tokenOwner.address,
//                     tokenId,
//                     order.price,
//                     order.endBlock,
//                     order.priceStep,
//                     order.expiredBlock,
//                     order.participants,
//                     order.shares,
//                     signature
//                 )
//             ).to.be.rejectedWith('Auction: end block is less than current');
//         });
//     });

//     describe(`method 'raise'`, () => {
//         let tokenId: string;
//         let price: number;
//         let priceStep: number;
//         let endBlock: number;
//         let participants: string[];
//         let shares: string[];
//         let orderId: string;

//         beforeEach(async () => {
//             const blockNumber = await ethers.provider.getBlockNumber();
//             const expiredBlock = blockNumber + 10;

//             tokenId = (await tokenMock.totalSupply()).toString();
//             price = 100000;
//             priceStep = 100;
//             endBlock = blockNumber + 100;
//             participants = [owner.address, tokenOwner.address];
//             shares = ['50000', '50000'];
//             orderId = '0';

//             auction = auction.connect(tokenOwner);
//             tokenMock = tokenMock.connect(tokenOwner);

//             await tokenMock.mint(tokenOwner.address, tokenId);

//             const order = {
//                 seller: tokenOwner.address,
//                 tokenId,
//                 endBlock,
//                 priceStep: '100',
//                 price: '100000',
//                 participants: [owner.address, tokenOwner.address],
//                 shares: ['50000', '50000'],
//                 expiredBlock,
//             };

//             const orderTypedData: OrderTypedDataInterface = { ...order };

//             const signature = await signAuctionOrder(marketSigner, auction.address, orderTypedData);

//             await safeTransferFrom(
//                 tokenOwner.address,
//                 tokenId,
//                 order.price,
//                 order.endBlock,
//                 order.priceStep,
//                 order.expiredBlock,
//                 order.participants,
//                 order.shares,
//                 signature
//             );

//             auction = auction.connect(buyer1);
//             tokenMock = tokenMock.connect(buyer1);
//         });

//         it(`should raise order price`, async () => {
//             price = price + priceStep;

//             await auction.raise(orderId, { value: price });

//             const order = await auction.order(orderId);

//             expect(order.price.toNumber()).equal(price);
//         });

//         it(`should increase contract balance`, async () => {
//             price = price + priceStep;

//             await expect(() => auction.raise(orderId, { value: price })).to.be.changeEtherBalances(
//                 [buyer1.address, auction.address],
//                 [price * -1, price]
//             );
//         });

//         it(`should set buyer`, async () => {
//             price = price + priceStep;

//             await auction.raise(orderId, { value: price });

//             const order = await auction.order(orderId);

//             expect(order.buyer).equal(buyer1.address);
//         });

//         it(`should change contract balance by price difference`, async () => {
//             price = price + priceStep;

//             await auction.raise(orderId, { value: price });

//             auction = auction.connect(buyer2);

//             const order = await auction.order(orderId);

//             const newValue = order.price.toNumber() + priceStep;

//             await expect(() =>
//                 auction.raise(orderId, { value: newValue })
//             ).to.be.changeEtherBalances(
//                 [buyer2.address, auction.address],
//                 [newValue * -1, priceStep]
//             );
//         });

//         it(`should change buyer`, async () => {
//             price = price + priceStep;

//             await auction.raise(orderId, { value: price });

//             auction = auction.connect(buyer2);

//             const order = await auction.order(orderId);

//             price = order.price.toNumber() + priceStep;

//             await auction.raise(orderId, { value: price });

//             const updatedOrder = await auction.order(orderId);

//             expect(updatedOrder.buyer).equal(buyer2.address);
//         });

//         it(`should send back ether to prev buyer`, async () => {
//             price = price + priceStep;

//             await auction.raise(orderId, { value: price });

//             auction = auction.connect(buyer2);

//             const order = await auction.order(orderId);

//             price = order.price.toNumber() + priceStep;

//             await expect(() => auction.raise(orderId, { value: price })).to.be.changeEtherBalances(
//                 [buyer2.address, auction.address, buyer1.address],
//                 [price * -1, priceStep, price - priceStep]
//             );
//         });

//         it(`should emit Raised event`, async () => {
//             price = price + priceStep;

//             await expect(auction.raise(orderId, { value: price }))
//                 .to.be.emit(auction, 'Raised')
//                 .withArgs(orderId, tokenId, buyer1.address, tokenOwner.address, price);
//         });

//         it(`should fail if order doesn't exist`, async () => {
//             price = price + priceStep;

//             await expect(auction.raise('1234', { value: price })).to.be.rejectedWith(
//                 'BaseMarket: order is not placed'
//             );
//         });

//         it(`should fail if auction is ended`, async () => {
//             price = price + priceStep;

//             await mineUpTo(endBlock);

//             await expect(auction.raise(orderId, { value: price })).to.be.rejectedWith(
//                 'Auction: auction is ended'
//             );
//         });

//         it(`should fail if caller is seller`, async () => {
//             price = price + priceStep;

//             auction = auction.connect(tokenOwner);

//             await expect(auction.raise(orderId, { value: price })).to.be.rejectedWith(
//                 'Auction: seller can not be buyer'
//             );
//         });

//         it(`should fail if sent ether amount isn't enough `, async () => {
//             price = price + priceStep - 1;

//             await expect(auction.raise(orderId, { value: price })).to.be.rejectedWith(
//                 'Auction: invalid ether amount'
//             );
//         });
//     });

//     describe(`method 'end'`, () => {
//         let tokenId: string;
//         let price: number;
//         let priceStep: number;
//         let endBlock: number;
//         let participants: string[];
//         let shares: number[];
//         let orderId: string;

//         beforeEach(async () => {
//             const blockNumber = await ethers.provider.getBlockNumber();
//             const expiredBlock = blockNumber + 10;

//             tokenId = (await tokenMock.totalSupply()).toString();
//             price = 91738;
//             priceStep = 100;
//             endBlock = blockNumber + 100;
//             participants = [owner.address, tokenOwner.address, randomAccount.address];
//             shares = [1234, 4567, 85937];
//             orderId = '0';

//             auction = auction.connect(tokenOwner);
//             tokenMock = tokenMock.connect(tokenOwner);

//             await tokenMock.mint(tokenOwner.address, tokenId);
//             await tokenMock.approve(auction.address, tokenId);

//             const order = {
//                 seller: tokenOwner.address,
//                 tokenId,
//                 endBlock,
//                 priceStep,
//                 price,
//                 participants,
//                 shares,
//                 expiredBlock,
//             };

//             const orderTypedData: OrderTypedDataInterface = { ...order };

//             const signature = await signAuctionOrder(marketSigner, auction.address, orderTypedData);

//             await safeTransferFrom(
//                 tokenOwner.address,
//                 tokenId,
//                 order.price,
//                 order.endBlock,
//                 order.priceStep,
//                 order.expiredBlock,
//                 order.participants,
//                 order.shares,
//                 signature
//             );

//             auction = auction.connect(buyer1);
//             tokenMock = tokenMock.connect(buyer1);
//         });

//         it(`should fail if order doesn't exist`, async () => {
//             await expect(auction.end('1234')).to.be.rejectedWith('BaseMarket: order is not placed');
//         });

//         it(`should fail if auction is still going`, async () => {
//             await expect(auction.end(orderId)).to.be.rejectedWith(
//                 'Auction: auction is still going'
//             );
//         });

//         it(`should emit Ended event`, async () => {
//             await mineUpTo(endBlock);

//             const order = await auction.order(orderId);

//             await expect(auction.end(orderId))
//                 .to.be.emit(auction, 'Ended')
//                 .withArgs(orderId, tokenId, order.buyer, tokenOwner.address, price);
//         });

//         describe(`if buyer doesn't exist`, () => {
//             beforeEach(async () => {
//                 await mineUpTo(endBlock);
//             });

//             it(`should transfer token back to seller`, async () => {
//                 await expect(auction.end(orderId))
//                     .to.be.emit(tokenMock, 'Transfer')
//                     .withArgs(auction.address, tokenOwner.address, tokenId);
//                 await expect(tokenMock.ownerOf(tokenId)).to.eventually.equal(
//                     tokenOwner.address
//                 );
//             });
//         });

//         describe(`if buyer exists`, () => {
//             beforeEach(async () => {
//                 price = price + priceStep;

//                 await auction.raise(orderId, { value: price });

//                 await mineUpTo(endBlock);
//             });

//             it(`should transfer token to buyer`, async () => {
//                 await expect(auction.end(orderId))
//                     .to.be.emit(tokenMock, 'Transfer')
//                     .withArgs(auction.address, buyer1.address, tokenId);
//                 await expect(tokenMock.ownerOf(tokenId)).to.eventually.equal(buyer1.address);
//             });

//             it(`should distribute ETH between participants according to shares`, async () => {
//                 const lastShareIndex = shares.length - 1;
//                 const totalShares = shares.reduce((acc, a) => acc + a, 0);
//                 let released = BigNumber.from(0);

//                 for (let i = 0; i < lastShareIndex; i++) {
//                     const value = BigNumber.from(shares[i]).mul(price).div(totalShares);

//                     released = released.add(value);

//                     shares[i] = value.toNumber();
//                 }

//                 shares[lastShareIndex] = BigNumber.from(price).sub(released).toNumber();

//                 await expect(() => auction.end(orderId)).to.be.changeEtherBalances(
//                     [auction.address, ...participants],
//                     [price * -1, ...shares]
//                 );
//             });
//         });
//     });
// });
