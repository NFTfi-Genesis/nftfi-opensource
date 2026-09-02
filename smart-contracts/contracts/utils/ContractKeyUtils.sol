// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

/**
 * @title ContractKeyUtils
 * @author NFTfi
 * @dev Common library for contract key utils
 */
library ContractKeyUtils {
    /**
     * @notice Returns the bytes32 representation of a string
     * @param _key the string key
     * @return id bytes32 representation
     */
    function getIdFromStringKey(string memory _key) public pure returns (bytes32 id) {
        // solhint-disable-next-line custom-errors
        require(bytes(_key).length <= 32, "invalid key");

        // solhint-disable-next-line no-inline-assembly
        assembly {
            id := mload(add(_key, 32))
        }
    }
}
