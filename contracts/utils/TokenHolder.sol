// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

abstract contract TokenHolder is IERC721Receiver {
    error TokenHolderUnauthorizedAccount(address account);

    /**
     * @dev ERC721 token contract address.
     */
    IERC721 public immutable TOKEN;

    /**
     * @dev Throws if called by any account other than the minter.
     */
    modifier onlyToken() {
        if (msg.sender != address(TOKEN)) revert TokenHolderUnauthorizedAccount(msg.sender);
        _;
    }

    /**
     * @param token ERC721 token contract address.
     */
    constructor(address token) {
        TOKEN = IERC721(token);
    }

    /**
     * @dev This method is the callback according to
     *   [IERC721Receiver](https://docs.openzeppelin.com/contracts/4.x/api/token/erc721#IERC721Receiver).
     * @dev This method can trigger only ERC721 token contract during `safeTransfer`.
     *
     * @param operator Token caller.
     * @param from Token owner.
     * @param tokenId Token for sale.
     * @param data Bytes data needed for order placing. See `_onReceived` method implementation.
     */
    function onERC721Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes calldata data
    ) external onlyToken returns (bytes4) {
        _onReceived(operator, from, tokenId, data);

        return this.onERC721Received.selector;
    }

    /**
     * @dev Transfers token `tokenId` from `from` to `to`.
     *
     * @param from Address from.
     * @param to Address to.
     * @param tokenId Token ID, token must be owned by `from`.
     */
    function _transferToken(address from, address to, uint256 tokenId) internal {
        TOKEN.transferFrom(from, to, tokenId);
    }

    /**
     * @dev Method is invoked by `onERC721Received`.
     *
     * @param operator Token caller.
     * @param from Token owner
     * @param tokenId Token ID.
     * @param data Depends on implementation.
     */
    function _onReceived(address operator, address from, uint256 tokenId, bytes calldata data) internal virtual;

    /**
     * @dev This empty reserved space.
     */
    uint256[20] private __gap;
}
