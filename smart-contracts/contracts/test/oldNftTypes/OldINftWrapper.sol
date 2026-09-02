// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

/**
 * @title OldINftWrapper
 * @author NFTfi
 * @dev Interface for NFT Wrappers.
 */
interface OldINftWrapper {
    function transferNFT(address from, address to, address nftContract, uint256 tokenId) external returns (bool);

    function isOwner(address owner, address nftContract, uint256 tokenId) external view returns (bool);
}
