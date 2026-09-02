// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

import {IRefinancingAdapter} from "./IRefinancingAdapter.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {IGondi} from "./gondi/IGondi.sol";

/**
 * @title GondiRefinancingAdapter
 * @author NFTfi
 * @dev This contract is an implementation of the IRefinancingAdapter for the Gondi platform.
 * It handles operations related to refinancing Gondi loans such as transferring the borrower role,
 * paying off loans, and retrieving loan and collateral details.
 */
contract GondiRefinancingAdapter is IRefinancingAdapter {
    /// @notice Precision used for calculating interests.
    uint256 internal constant PRECISION = 10000;
    uint256 private constant SECONDS_PER_YEAR = 31536000;
    uint256 internal constant MAX_UINT256 = 2 ** 256 - 1;

    error transferBorrowerRoleFailed();
    error LoanIdMismatch();

    /**
     * @dev Gets the address of the borrower for a specific Gondi loan.
     * @param _extraData The ABI-encoded LoanRepaymentData struct containing loan details from Gondi
     * This data must be retrieved from events as Gondi does not provide a direct query method.
     * @return address of the borrower from the encoded Lien struct.
     */
    function getBorrowerAddress(address, uint256, bytes calldata _extraData) external pure override returns (address) {
        IGondi.LoanRepaymentData memory loanRepaymentData = _decodeExtraData(_extraData);
        return loanRepaymentData.loan.borrower;
    }

    /**
     * @dev Handles the borrower role transfer for Gondi loans.
     * @notice For Gondi, no borrower role transfer is possible, unused function
     * @return Always returns true as no additional action is required.
     */
    function transferBorrowerRole(address, uint256, bytes calldata) external pure override returns (bool) {
        return true;
    }

    /**
     * @dev Pays off a Gondi loan as part of the refinancing process.
     * @param _loanContract The address of the Gondi contract.
     * @param _payBackAmount The amount of WETH tokens used to pay back the Gondi loan.
     * @param _extraData The ABI-encoded LoanRepaymentData struct containing loan details from Gondi
     * @return A boolean value indicating whether the operation was successful.
     * @notice This function calls Gondi's repay function with the loan repayment details.
     */
    function payOffRefinancable(
        address _loanContract,
        uint256 _loanId,
        address _payBackToken,
        uint256 _payBackAmount,
        bytes calldata _extraData
    ) external override returns (bool) {
        IGondi.LoanRepaymentData memory loanRepaymentData = _decodeExtraData(_extraData);
        if (loanRepaymentData.loan.tranche[0].loanId != _loanId) {
            revert LoanIdMismatch();
        }
        IERC20(_payBackToken).transfer(loanRepaymentData.loan.borrower, _payBackAmount);
        IGondi(_loanContract).repayLoan(loanRepaymentData);
        return true;
    }

    /**
     * @dev Gets the NFT collateral information for a specific Gondi loan.
     * @param _extraData The ABI-encoded LoanRepaymentData struct containing loan details from Gondi
     * @return nftCollateralContract The address of the NFT collection contract.
     * @return nftCollateralId The token ID of the NFT used as collateral.
     */
    function getCollateral(
        address,
        uint256,
        bytes calldata _extraData
    ) external pure override returns (address, uint256) {
        IGondi.Loan memory loan = _decodeExtraData(_extraData).loan;
        return (loan.nftCollateralAddress, loan.nftCollateralTokenId);
    }

    /**
     * @dev Gets the payoff details for a specific Gondi loan.
     * @param _extraData The ABI-encoded LoanRepaymentData struct containing loan details from Gondi
     * @return loanERC20Denomination The address of the payoff token (always WETH for Gondi).
     * @return maximumRepaymentAmount The total amount required to pay off the loan, calculated based
     * on the principal, interest rate, and time elapsed since loan creation.
     * @notice This function calculates the current debt including accrued interest at the moment of calling.
     * We are using the exact logic from Gondi's computeCurrentDebt function
     */
    function getPayoffDetails(
        address,
        uint256,
        bytes calldata _extraData
    ) external view override returns (address, uint256) {
        IGondi.Loan memory loan = _decodeExtraData(_extraData).loan;
        address payoffToken = loan.principalAddress;
        uint256 payOffAmount = _calculateRepayment(loan);
        return (payoffToken, payOffAmount);
    }

    /**
     * @dev Helper function to decode the Lien struct from the encoded extraData.
     * @param _extraData The ABI-encoded LoanRepaymentData struct containing loan details from Gondi
     * @return loanRepaymentData The decoded Lien struct containing all loan details.
     */
    function _decodeExtraData(
        bytes calldata _extraData
    ) internal pure returns (IGondi.LoanRepaymentData memory loanRepaymentData) {
        loanRepaymentData = abi.decode(_extraData, (IGondi.LoanRepaymentData));
    }

    function _calculateRepayment(IGondi.Loan memory loan) private view returns (uint256) {
        uint256 totalRepayment = 0;

        uint256 totalTranches = loan.tranche.length;
        for (uint256 i; i < totalTranches; ) {
            IGondi.Tranche memory tranche = loan.tranche[i];
            uint256 newInterest = _getInterest(
                tranche.principalAmount,
                tranche.aprBps,
                block.timestamp - tranche.startTime
            );
            uint256 repayment = tranche.principalAmount + tranche.accruedInterest + newInterest;
            unchecked {
                totalRepayment += repayment;
            }
            unchecked {
                ++i;
            }
        }
        return totalRepayment;
    }

    function _getInterest(uint256 _amount, uint256 _aprBps, uint256 _duration) private pure returns (uint256) {
        uint256 interest = mulDivUp(_amount, _aprBps * _duration, PRECISION * SECONDS_PER_YEAR);
        return interest;
    }

    function mulDivUp(uint256 x, uint256 y, uint256 denominator) internal pure returns (uint256 z) {
        // solhint-disable-next-line no-inline-assembly
        assembly {
            // Equivalent to require(denominator != 0 && (y == 0 || x <= type(uint256).max / y))
            if iszero(mul(denominator, iszero(mul(y, gt(x, div(MAX_UINT256, y)))))) {
                revert(0, 0)
            }

            // If x * y modulo the denominator is strictly greater than 0,
            // 1 is added to round up the division of x * y by the denominator.
            z := add(gt(mod(mul(x, y), denominator), 0), div(mul(x, y), denominator))
        }
    }
}
