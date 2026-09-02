// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

interface IPersonalEscrowFactory {
    function pause() external;

    function unpause() external;

    function createPersonalEscrow() external returns (address);

    function personalEscrowOfOwner(address _owner) external view returns (address);

    function isPersonalEscrow(address _escrow) external view returns (bool);
}
