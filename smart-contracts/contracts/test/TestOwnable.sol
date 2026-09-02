// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Ownable} from "../utils/Ownable.sol";

contract TestOwnable is Ownable {
    constructor(address _admin) Ownable(_admin) {
        // solhint-disable-previous-line no-empty-blocks
    }
}
