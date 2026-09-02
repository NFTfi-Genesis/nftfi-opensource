// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

/**
 * @title ILoanCoordinator
 * @author NFTfi
 * @dev LoanCoordinator interface.
 */
interface ILoanCoordinator {
    enum StatusType {
        NOT_EXISTS,
        NEW,
        REPAID,
        LIQUIDATED
    }

    /**
     * @notice This struct contains data related to a loan
     *
     * @param smartNftId - The id of both the promissory note and obligation receipt.
     * @param status - The status in which the loan currently is.
     * @param loanContract - Address of the contract that created the loan.
     */
    struct Loan {
        address loanContract;
        uint64 smartNftId;
        StatusType status;
    }

    function registerLoan() external returns (uint32);

    function resetSmartNfts(uint32 _loanId) external;

    function mintObligationReceipt(uint32 _loanId, address _borrower) external;

    function mintPromissoryNote(uint32 _loanId, address _lender) external;

    function resolveLoan(uint32 _loanId, bool liquidated) external;

    function promissoryNoteToken() external view returns (address);

    function obligationReceiptToken() external view returns (address);

    function getLoanData(uint32 _loanId) external view returns (Loan memory);

    function isValidLoanId(uint32 _loanId, address _loanContract) external view returns (bool);

    function getDefaultLoanContractForOfferType(bytes32 _offerType) external view returns (address);

    function getTypeOfLoanContract(address _loanContract) external view returns (bytes32);

    function checkNonce(address _user, uint256 _nonce) external view;

    function checkAndInvalidateNonce(address _user, uint256 _nonce) external;
}
