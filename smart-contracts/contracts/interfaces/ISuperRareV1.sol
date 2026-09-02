// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

/**
 * @title ISuperRareV1
 * @author NFTfi
 * @dev Test contract with SuperRareV1 ERC721 related functionalities.
 * Extracted from https://etherscan.io/address/0x41a322b28d0ff354040e2cbc676f0320d8c8850d#code
 */
interface ISuperRareV1 {
    event Transfer(address from, address to, uint256 tokenId);

    function balanceOf(address _owner) external view returns (uint256 _balance);
    function ownerOf(uint256 _tokenId) external view returns (address _owner);
    function transfer(address _to, uint256 _tokenId) external;
    function approve(address _to, uint256 _tokenId) external;
    function takeOwnership(uint256 _tokenId) external;
}
