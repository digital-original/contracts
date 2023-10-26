export type OrderStruct = {
    seller: string;
    tokenId: string;
    price: bigint;
    participants: string[];
    shares: bigint[];
    deadline: number;
};

type WalletConfig = {
    public: string;
    private: string;
};

type UpgradableContractConfig = {
    proxy: string;
    admin: string;
}

export type ChainConfig = {
    wallets: {
        deployer: WalletConfig;
        proxyAdminOwner: WalletConfig;
        minter: WalletConfig;
        marketSigner: WalletConfig;
        platform: WalletConfig;
    };
    contracts: {
        token: string;
        market: UpgradableContractConfig;
        auction: UpgradableContractConfig;
        transferChecker: string;
    };
};
