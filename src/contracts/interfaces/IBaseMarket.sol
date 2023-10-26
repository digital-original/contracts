// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

/**
 * @title IBaseMarket.
 *
 * @notice BaseMarket abstract contract interface.
 * @notice Abstract contract BaseMarket provides market basic logic.
 */
interface IBaseMarket is IERC721Receiver {
    /**
     * @notice Places order and locks token on the contract.
     *
     * @dev This method is the callback according to
     *   [IERC721Receiver](https://docs.openzeppelin.com/contracts/4.x/api/token/erc721#IERC721Receiver).
     * @dev This method can trigger only ERC721 token contract during `safeTransfer`.
     *
     * @param operator Token caller.
     * @param from Token owner.
     * @param tokenId Token for sale.
     * @param data Bytes data needed for order placing. See implementation contract.
     */
    function onERC721Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes calldata data
    ) external returns (bytes4);
}
