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
    wallets: {
        deployer: WalletConfig;
        proxyAdminOwner: WalletConfig;
        minter: WalletConfig;
        auctionSigner: WalletConfig;
        marketSigner: WalletConfig;
        platform: WalletConfig;
    };
    contracts: {
        artToken: UpgradeableContractConfig;
        market: UpgradeableContractConfig;
        auctionHouse: UpgradeableContractConfig;
    };
};

export type ContractConstructorArgs = (string | Uint8Array | Addressable)[];

export type AddressParam = string | Addressable;

export type Signer = EthersSigner;
