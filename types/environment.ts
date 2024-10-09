import type { Addressable, Signer as EthersSigner } from 'ethers';

export type WalletConfig = {
    public: string;
    private: string;
};

export type UpgradeableContractConfig = {
    proxy: string;
    impl: string;
    admin: string;
};

export type ChainConfig = {
    wallets?: {
        deployer: WalletConfig;
        main: WalletConfig;
    };
    contracts?: {
        artToken: UpgradeableContractConfig;
        auctionHouse: UpgradeableContractConfig;
    };
    usdc?: string;
    minAuctionDurationHours?: number;
};

export type ContractConstructorArgs = (string | number | Uint8Array | Addressable)[];

export type AddressParam = string | Addressable;

export type Signer = EthersSigner;
