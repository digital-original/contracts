import type { Addressable, Signer as EthersSigner } from 'ethers';

export type UpgradeableContractConfig = {
    proxy: string;
    impl: string;
    admin: string;
};

export type ChainConfig = {
    chainId: number;
    url: string;
    usdc: string;
    minAuctionDurationHours: number;
    deployerPrivateKey: string;
    main: string;
    artToken: UpgradeableContractConfig;
    auctionHouse: UpgradeableContractConfig;
};

export type ContractConstructorArgs = (string | number | Uint8Array | Addressable)[];

export type AddressParam = string | Addressable;

export type Signer = EthersSigner;
