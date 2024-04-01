// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {ERC721Holder} from "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";

contract AuctionHouseMock is ERC721Holder {
    string public constant NAME = "AuctionHouseMock";
}
