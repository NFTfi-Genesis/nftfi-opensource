// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

/**
 * @title IRepaymentController
 * @author
 * @dev
 */
interface IRepaymentController {
    function repay(uint256 loanId) external;
}
