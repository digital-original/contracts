import type { Addressable, Signer as EthersSigner } from 'ethers';

export type WalletConfig = {
    public: string;
    private: string;
};

export type UpgradeableContractConfig = {
    proxy: string;
    admin: string;
};

export type ChainConfig = {
    wallets: {
        deployer: WalletConfig;
        proxyAdminOwner: WalletConfig;
        minter: WalletConfig;
        marketSigner: WalletConfig;
        platform: WalletConfig;
    };
    contracts: {
        token: UpgradeableContractConfig;
        market: UpgradeableContractConfig;
        auction: UpgradeableContractConfig;
    };
};

export type ContractConstructorArgs = (string | Uint8Array | Addressable)[];

export type AddressParam = string | Addressable;

export type Signer = EthersSigner;
