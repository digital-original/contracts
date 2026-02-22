// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.20;

import {Market} from "../market/Market.sol";
import {Deployment} from "./Deployment.sol";

/**
 * @title MarketDeployer
 * @notice Helper contract that deploys the `Market` contract behind a transparent upgradeable
 *         proxy.
 */
contract MarketDeployer {
    /**
     * @notice Emitted once the proxy contract is deployed.
     * @param market Address of the newly deployed Market proxy.
     */
    event Deployed(address market);

    /**
     * @notice Deploys upgradeable `Market` instance.
     * @dev The constructor performs the following steps:
     *      1. Computes the expected proxy addresses using the current contract nonce (deploy
     *         order is deterministic).
     *      2. Deploys the implementation contract.
     *      3. Deploys the transparent proxy.
     *      4. Reverts if the actual proxy addresses do not match the pre-computed ones.
     *      5. Emits {Deployed}.
     * @param main Address that will be set as {RoleSystem.MAIN}.
     * @param wrappedEther Address of the Wrapped Ether contract.
     */
    constructor(address main, address wrappedEther) {
        address calculatedMarketProxy = Deployment.calculateContractAddress(address(this), 2);

        address marketImpl = address(new Market(calculatedMarketProxy, main, wrappedEther));

        address marketProxy = Deployment.deployUpgradeableContract(marketImpl, main);

        if (marketProxy != calculatedMarketProxy) revert DeployerIncorrectAddress();

        emit Deployed(marketProxy);
    }

    /// @dev Thrown when the proxy is not deployed at the expected deterministic address.
    error DeployerIncorrectAddress();
}
