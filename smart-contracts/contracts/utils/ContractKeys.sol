// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

/**
 * @title ContractKeys
 * @author NFTfi
 * @dev Common library for contract keys
 */
library ContractKeys {
    bytes32 public constant PERMITTED_ERC20S = bytes32("PERMITTED_ERC20S");
    bytes32 public constant PERMITTED_NFTS = bytes32("PERMITTED_NFTS");
    bytes32 public constant NFT_TYPE_REGISTRY = bytes32("NFT_TYPE_REGISTRY");
    bytes32 public constant LOAN_COORDINATOR = bytes32("LOAN_COORDINATOR");
    bytes32 public constant PERMITTED_SNFT_RECEIVER = bytes32("PERMITTED_SNFT_RECEIVER");
    bytes32 public constant ESCROW = bytes32("ESCROW");
    bytes32 public constant ERC20_TRANSFER_MANAGER = bytes32("ERC20_TRANSFER_MANAGER");
    bytes32 public constant PERSONAL_ESCROW_FACTORY = bytes32("PERSONAL_ESCROW_FACTORY");
    bytes32 public constant DELEGATE_PLUGIN = bytes32("DELEGATE_PLUGIN");
}
