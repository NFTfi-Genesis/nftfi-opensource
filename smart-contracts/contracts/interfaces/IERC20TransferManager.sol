// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

interface IERC20TransferManager {
    function transfer(address _token, address _sender, address _recipient, uint256 _amount) external;

    function safeLoanPaybackTransfer(address _token, address _sender, address _recipient, uint256 _amount) external;

    function safeAdminFeeTransfer(address _token, address _sender, address _recipient, uint256 _amount) external;
}
