// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.20;

import {ArtToken} from "../art-token/ArtToken.sol";
import {AuctionHouse} from "../auction-house/AuctionHouse.sol";
import {Deployment} from "./Deployment.sol";

/**
 * @title CollectionDeployer
 * @notice Helper contract that deploys and wires together fresh instances of `ArtToken` and
 *         `AuctionHouse` behind transparent upgradeable proxies. Intended for deterministic
 *         deployments during initial collection setup.
 * @dev The contract self-destructs implicitly after construction (no storage is written). It
 *      relies on {Deployment.calculateContractAddress} to pre-compute the proxy addresses,
 *      ensuring that the implementation constructors can reference each other before the proxies
 *      exist.
 */
contract CollectionDeployer {
    /**
     * @notice Emitted once the proxy contracts are deployed and initialized.
     * @param artToken Address of the newly deployed ArtToken proxy.
     * @param auctionHouse Address of the newly deployed AuctionHouse proxy.
     */
    event Deployed(address artToken, address auctionHouse);

    /**
     * @notice Deploys upgradeable `ArtToken` and `AuctionHouse` instances.
     * @dev The constructor performs the following steps:
     *      1. Computes the expected proxy addresses using the current contract nonce (deploy
     *         order is deterministic).
     *      2. Deploys the implementation contracts, passing the computed proxy addresses so they
     *         can reference each other.
     *      3. Deploys the transparent proxies via {Deployment.deployUpgradeableContract}.
     *      4. Reverts if the actual proxy addresses do not match the pre-computed ones.
     *      5. Calls `initialize` on the ArtToken proxy to set `name` and `symbol`.
     *      6. Emits {Deployed}.
     * @param name Collection name.
     * @param symbol Collection symbol.
     * @param main Address that will be set as {RoleSystem.MAIN}.
     * @param wrappedEther Address of the Wrapped Ether contract.
     * @param minAuctionDuration Minimum auction duration (seconds) enforced by AuctionHouse.
     */
    constructor(
        string memory name,
        string memory symbol,
        address main,
        address wrappedEther,
        uint256 minAuctionDuration
    ) {
        address calculatedArtTokenProxy = Deployment.calculateContractAddress(address(this), 3);
        address calculatedAuctionHouseProxy = Deployment.calculateContractAddress(address(this), 4);

        // prettier-ignore
        address artTokenImpl = address(
            new ArtToken(
                calculatedArtTokenProxy,
                main,
                wrappedEther,
                calculatedAuctionHouseProxy
            )
        );

        // prettier-ignore
        address auctionHouseImpl = address(
            new AuctionHouse(
                calculatedAuctionHouseProxy,
                main,
                wrappedEther,
                calculatedArtTokenProxy,
                minAuctionDuration
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
