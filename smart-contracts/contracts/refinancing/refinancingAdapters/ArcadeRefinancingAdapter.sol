// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

import {IRefinancingAdapter} from "./IRefinancingAdapter.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {IArcadeLoanCore} from "./arcade/IArcadeLoanCore.sol";
import {IRepaymentController} from "./arcade/IRepaymentController.sol";
import {InterestCalculator} from "./arcade/InterestCalculator.sol";

/**
 * @title ArcadeRefinancingAdapter
 * @author NFTfi
 * @dev This contract is an implementation of the IRefinancingAdapter for the Arcade platform.
 * It handles operations related to refinancing Arcade loans such as transferring the borrower role,
 * paying off loans, and retrieving loan and collateral details.
 */
contract ArcadeRefinancingAdapter is IRefinancingAdapter, InterestCalculator {
    address public constant repaymentController = 0x74241e1A9c021643289476426B9B70229Ab40D53;

    error transferBorrowerRoleFailed();

    /**
     * @dev Gets the address of the borrower for a specific Arcade loan.
     * @param _loanContract The address of the contract containing the Arcade loan.
     * @param _loanIdentifier The unique identifier for the Arcade loan.
     * @return The address of the borrower.
     */
    function getBorrowerAddress(
        address _loanContract,
        uint256 _loanIdentifier,
        bytes calldata
    ) external view override returns (address) {
        return IERC721(IArcadeLoanCore(_loanContract).borrowerNote()).ownerOf(_loanIdentifier);
    }

    /**
     * @dev Transfers the borrower role to this contract for a specific Arcade loan.
     * @param _loanContract The address of the contract containing the Arcade loan.
     * @param _loanIdentifier The unique identifier for the Arcade loan.
     * @return A boolean value indicating whether the operation was successful.
     */
    function transferBorrowerRole(
        address _loanContract,
        uint256 _loanIdentifier,
        bytes calldata
    ) external override returns (bool) {
        IERC721 borrowerNote = IERC721(IArcadeLoanCore(_loanContract).borrowerNote());
        address borrower = borrowerNote.ownerOf(_loanIdentifier);
        borrowerNote.transferFrom(borrower, address(this), _loanIdentifier);
        if (borrowerNote.ownerOf(_loanIdentifier) != address(this)) revert transferBorrowerRoleFailed();
        return (true);
    }

    /**
     * @dev Pays off an Arcade loan with a specified amount of a specified token.
     * @param _loanContract The address of the contract containing the Arcade loan.
     * @param _loanIdentifier The unique identifier for the Arcade loan.
     * @param _payBackToken The token used to pay back the Arcade loan.
     * @param _payBackAmount The amount of tokens used to pay back the Arcade loan.
     * @return A boolean value indicating whether the operation was successful.
     */
    function payOffRefinancable(
        address _loanContract,
        uint256 _loanIdentifier,
        address _payBackToken,
        uint256 _payBackAmount,
        bytes calldata
    ) external override returns (bool) {
        IERC20(_payBackToken).approve(_loanContract, _payBackAmount);
        IRepaymentController(repaymentController).repay(_loanIdentifier);
        return (true);
    }

    /**
     * @dev Gets the collateral information for a specific Arcade loan.
     * @param _loanContract The address of the contract containing the Arcade loan.
     * @param _loanIdentifier The unique identifier for the Arcade loan.
     * @return nftCollateralContract nftCollateralId
     * The address of the collateral token contract and the ID of the collateral.
     */
    function getCollateral(
        address _loanContract,
        uint256 _loanIdentifier,
        bytes calldata
    ) external view override returns (address, uint256) {
        // get loan data
        IArcadeLoanCore.LoanData memory data = IArcadeLoanCore(_loanContract).getLoan(_loanIdentifier);
        return (data.terms.collateralAddress, data.terms.collateralId);
    }

    /**
     * @dev Retrieves the loan coordinator from a specific Arcade loan contract.
     * @param _loanContract The address of the contract containing the Arcade loan.
     * @return  The loan coordinator contract.
     */

    /**
     * @dev Gets the collateral information for a specific Arcade loan.
     * @param _loanContract The address of the contract containing the Arcade loan.
     * @param _loanIdentifier The unique identifier for the Arcade loan.
     * @return loanERC20Denomination maximumRepaymentAmount
     *  The address of the payoff token and the required payoff amount.
     */
    function getPayoffDetails(
        address _loanContract,
        uint256 _loanIdentifier,
        bytes calldata
    ) external view override returns (address, uint256) {
        // get loan data
        IArcadeLoanCore.LoanData memory data = IArcadeLoanCore(_loanContract).getLoan(_loanIdentifier);
        // get interest amount due
        uint256 interestAmount = getInterestAmount(data.terms.principal, data.terms.proratedInterestRate);
        uint256 payOffAmount = interestAmount + data.terms.principal;
        return (data.terms.payableCurrency, payOffAmount);
    }
}
