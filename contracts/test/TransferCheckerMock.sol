// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import {ITransferChecker} from "../interfaces/ITransferChecker.sol";

contract TransferCheckerMock is ITransferChecker {
    bool private _shouldPass = true;

    function check(address, address, uint256) external view {
        require(_shouldPass, "TransferCheckerMock: failed");
    }

    function shouldPass() external view returns (bool) {
        return _shouldPass;
    }

    function shouldPass(bool value) external {
        _shouldPass = value;
    }
}
