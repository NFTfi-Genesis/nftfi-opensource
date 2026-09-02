// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

/**
 * @title INftWrapper
 * @author NFTfi
 * @dev Interface for NFT Wrappers.
 */
interface INftWrapper {
    function transferNFT(address from, address to, address nftContract, uint256 tokenId) external returns (bool);

    function approveNFT(address to, address nftContract, uint256 tokenId) external returns (bool);

    function isOwner(address owner, address nftContract, uint256 tokenId) external view returns (bool);

    function balanceOf(address owner, address nftContract, uint256 tokenId) external view returns (uint256);
}
