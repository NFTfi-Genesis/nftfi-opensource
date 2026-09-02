// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

import {LoanData} from "./LoanData.sol";

interface ILoanBase {
    function maximumLoanDuration() external view returns (uint256);

    function adminFeeInBasisPoints() external view returns (uint16);

    // solhint-disable-next-line func-name-mixedcase
    function LOAN_COORDINATOR() external view returns (bytes32);

    function getLoanTerms(uint32) external view returns (LoanData.LoanTerms memory);

    function loanRepaidOrLiquidated(uint32) external view returns (bool);

    function getWhetherRenegotiationNonceHasBeenUsedForUser(address _user, uint256 _nonce) external view returns (bool);
}
