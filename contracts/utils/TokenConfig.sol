// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.20;

/**
 * @title TokenConfig
 * @notice A library for managing token configuration, including creator and regulation mode.
 */
library TokenConfig {
    /**
     * @notice Defines the regulation modes for a token.
     * @param None Default value, should not be used.
     * @param Unregulated The token is not subject to transfer restrictions.
     * @param Regulated The token is subject to transfer restrictions.
     */
    enum RegulationMode {
        None,
        Unregulated,
        Regulated
    }

    /**
     * @notice Represents the configuration for a single token.
     * @param creator The address of the token's creator.
     * @param regulationMode The regulation mode of the token.
     */
    struct Type {
        address creator;
        RegulationMode regulationMode;
    }

    /// @notice EIP-712 type hash for the {TokenConfig.Type} struct.
    // prettier-ignore
    bytes32 internal constant TYPE_HASH =
        keccak256(
            "TokenConfig("
                "address creator,"
                "uint8 regulationMode"
            ")"
        );

    /**
     * @notice Hashes a token configuration using the EIP-712 standard.
     * @param config The token configuration to hash.
     * @return The EIP-712 hash of the configuration.
     */
    function hash(Type calldata config) internal pure returns (bytes32) {
        return keccak256(abi.encode(TYPE_HASH, config.creator, config.regulationMode));
    }

    /**
     * @notice Validates that a token configuration is properly populated,
     *         meaning it has a non-zero creator and a valid regulation mode.
     * @dev Reverts if the token configuration is not properly populated.
     * @param tokenConfig The token configuration to validate.
     */
    function requirePopulated(TokenConfig.Type calldata tokenConfig) internal pure {
        if (tokenConfig.creator == address(0)) {
            revert TokenConfigNotPopulated();
        }

        if (tokenConfig.regulationMode == TokenConfig.RegulationMode.None) {
            revert TokenConfigNotPopulated();
        }
    }

    /// @dev Thrown when a token configuration is not properly populated.
    error TokenConfigNotPopulated();
}
