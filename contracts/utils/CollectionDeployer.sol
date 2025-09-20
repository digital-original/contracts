// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.20;

import {ArtToken} from "../art-token/ArtToken.sol";
import {AuctionHouse} from "../auction-house/AuctionHouse.sol";
import {Deployment} from "./Deployment.sol";

/**
 * @title CollectionDeployer
 *
 * @notice Helper contract that deploys and wires together fresh instances of `ArtToken` and
 *         `AuctionHouse` behind transparent upgradeable proxies. Intended for deterministic
 *         deployments during initial collection setup.
 *
 * @dev The contract self-destructs implicitly after construction (no storage is written). It
 *      relies on {Deployment.calculateContractAddress} to pre-compute the proxy addresses,
 *      ensuring that the implementation constructors can reference each other before the proxies
 *      exist.
 */
contract CollectionDeployer {
    /// @notice Emitted once the proxy contracts are deployed and initialised.
    /// @param artToken Address of the newly deployed ArtToken proxy.
    /// @param auctionHouse Address of the newly deployed AuctionHouse proxy.
    event Deployed(address artToken, address auctionHouse);

    /**
     * @notice Deploys upgradeable `ArtToken` and `AuctionHouse` instances.
     *
     * @dev The constructor performs the following steps:
     *      1. Computes the expected proxy addresses using the current contract nonce (deploy
     *         order is deterministic).
     *      2. Deploys the implementation contracts, passing the computed proxy addresses so they
     *         can reference each other.
     *      3. Deploys the transparent proxies via {Deployment.deployUpgradeableContract}.
     *      4. Reverts with {DeployerIncorrectAddress} if the actual proxy addresses do not
     *         match the pre-computed ones (should never happen unless the deployment order
     *         changes).
     *      5. Calls `initialize` on the ArtToken proxy to set `name` and `symbol`.
     *      6. Emits {Deployed}.
     *
     * @param name ERC-721 collection name.
     * @param symbol ERC-721 collection symbol.
     * @param main Address that will be set as {RoleSystem.MAIN}.
     * @param usdc Address of the USDC token contract.
     * @param minPrice Global minimum primary-sale price.
     * @param minFee Global minimum platform fee.
     * @param minAuctionDuration Minimum auction duration (seconds) enforced by AuctionHouse.
     */
    constructor(
        string memory name,
        string memory symbol,
        address main,
        address usdc,
        uint256 minPrice,
        uint256 minFee,
        uint256 minAuctionDuration
    ) {
        address calculatedArtTokenProxy = Deployment.calculateContractAddress(address(this), 3);
        address calculatedAuctionHouseProxy = Deployment.calculateContractAddress(address(this), 4);

        address artTokenImpl = address(
            new ArtToken(
                calculatedArtTokenProxy,
                main,
                calculatedAuctionHouseProxy,
                usdc,
                minPrice,
                minFee //
            )
        );

        address auctionHouseImpl = address(
            new AuctionHouse(
                calculatedAuctionHouseProxy,
                main,
                calculatedArtTokenProxy,
                usdc,
                minAuctionDuration,
                minPrice,
                minFee
            )
        );

        address artTokenProxy = Deployment.deployUpgradeableContract(artTokenImpl, main);
        address auctionHouseProxy = Deployment.deployUpgradeableContract(auctionHouseImpl, main);

        if (artTokenProxy != calculatedArtTokenProxy) revert DeployerIncorrectAddress();
        if (auctionHouseProxy != calculatedAuctionHouseProxy) revert DeployerIncorrectAddress();

        ArtToken(artTokenProxy).initialize(name, symbol);

        emit Deployed(artTokenProxy, auctionHouseProxy);
    }

    /// @dev Thrown when the proxies are not deployed at the expected deterministic addresses.
    error DeployerIncorrectAddress();
}
