// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import {INftWrapper} from "../../interfaces/INftWrapper.sol";
import {ISuperRareV1} from "../../interfaces/ISuperRareV1.sol";

/**
 * @title ERC721LegacyWrapper
 * @author NFTfi
 * @dev Provides logic to transfer ERC721, uses regular transferFrom instead of safe
 */
contract SuperRareV1Wrapper is INftWrapper {
    error OnlyPushTrasfer();
    error NoApprovalSupported();

    /**
     * @dev Transfers ERC721 `_nftId` handled by the contract `_nftContract` from `_sender` to `_recipient`
     *
     * @param _sender - The current owner of the ERC721
     * @param _recipient - The new owner of the ERC721
     * @param _nftContract - ERC721 contract
     * @param _nftId - ERC721 id
     *
     * @return true if successfully transferred, false otherwise
     */
    function transferNFT(
        address _sender,
        address _recipient,
        address _nftContract,
        uint256 _nftId
    ) external override returns (bool) {
        if (_sender != address(this)) revert OnlyPushTrasfer();
        ISuperRareV1(_nftContract).transfer(_recipient, _nftId);
        return true;
    }

    function approveNFT(address, address, uint256) external pure override returns (bool) {
        revert NoApprovalSupported();
    }

    function isOwner(address _owner, address _nftContract, uint256 _tokenId) public view override returns (bool) {
        return ISuperRareV1(_nftContract).ownerOf(_tokenId) == _owner;
    }

    function balanceOf(
        address _owner,
        address _nftContract,
        uint256 _tokenId
    ) external view override returns (uint256) {
        if (isOwner(_owner, _nftContract, _tokenId)) {
            return 1;
        } else {
            return 0;
        }
    }
}
