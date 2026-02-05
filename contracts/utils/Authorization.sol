// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.20;

import {EIP712Domain} from "./EIP712Domain.sol";
import {EIP712Signature} from "./EIP712Signature.sol";
import {RoleSystem} from "./role-system/RoleSystem.sol";
import {Roles} from "./Roles.sol";

/**
 * @title Authorization
 *
 * @notice Mixin that provides EIP-712 based action authorization using a
 *         dedicated `SIGNER_ROLE` account. Intended to be inherited by
 *         contracts that need off-chain signatures for sensitive operations.
 *
 * @dev Relies on {EIP712Domain} for the domain separator and on
 *      {RoleSystem} for role storage. The helper {_requireAuthorizedAction}
 *      validates both signature freshness and signer authenticity.
 */
abstract contract Authorization is EIP712Domain, RoleSystem {
    /**
     * @notice Verifies that `signature` is a valid authorization for
     *         `messageHash` and that it has not expired.
     *
     * @dev Reverts with {AuthorizationDeadlineExpired} if `deadline` has passed
     *      or with {AuthorizationUnauthorizedAction} if the recovered signer
     *      does not hold the `SIGNER_ROLE`.
     *
     * @param messageHash EIP-712 struct hash (already `keccak256`-encoded).
     * @param deadline    UNIX timestamp after which the signature is considered invalid.
     * @param signature   EIP-712 signature (65/64-byte format accepted by
     *                    {EIP712Signature.recover}).
     */
    function _requireAuthorizedAction(bytes32 messageHash, uint256 deadline, bytes calldata signature) internal view {
        if (deadline < block.timestamp) {
            revert AuthorizationDeadlineExpired();
        }

        address signer = EIP712Signature.recover(DOMAIN_SEPARATOR, messageHash, signature);

        if (uniqueRoleOwner(Roles.SIGNER_ROLE) != signer) {
            revert AuthorizationUnauthorizedAction();
        }
    }

    /// @dev Revert thrown when the recovered signer lacks `SIGNER_ROLE`.
    error AuthorizationUnauthorizedAction();

    /// @dev Revert thrown when `deadline` has already passed.
    error AuthorizationDeadlineExpired();
}
