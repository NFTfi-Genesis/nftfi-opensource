// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

import {
    ILoanCoordinator,
    LoanBaseMinimal,
    NFTfiSigningUtils,
    LoanChecksAndCalculations,
    LoanData
} from "./LoanBaseMinimal.sol";
import {ContractKeyUtils} from "../../utils/ContractKeyUtils.sol";

/**
 * @title  AssetOfferLoan
 * @author NFTfi
 * @notice Main contract for NFTfi Loans Type. This contract manages the ability to create NFT-backed
 * peer-to-peer loans of type Fixed (agreed to be a fixed-repayment loan) where the borrower pays the
 * maximumRepaymentAmount regardless of whether they repay early or not.
 *
 * There are two ways to commence an NFT-backed loan:
 *
 * a. The borrower accepts a lender's offer by calling `acceptOffer`.
 *   1. the borrower calls nftContract.approveAll(NFTfi), approving the NFTfi contract to move their NFT's on their
 * behalf.
 *   2. the lender calls erc20Contract.approve(NFTfi), allowing NFTfi to move the lender's ERC20 tokens on their
 * behalf.
 *   3. the lender signs an off-chain message, proposing its offer terms.
 *   4. the borrower calls `acceptOffer` to accept these terms and enter into the loan. The NFT is stored in
 * the contract, the borrower receives the loan principal in the specified ERC20 currency, the lender can mint an
 * NFTfi promissory note (in ERC721 form) that represents the rights to either the principal-plus-interest, or the
 * underlying NFT collateral if the borrower does not pay back in time, and the borrower can mint an obligation receipt
 * (in ERC721 form) that gives them the right to pay back the loan and get the collateral back.
 *
 * The lender can freely transfer and trade this ERC721 promissory note as they wish, with the knowledge that
 * transferring the ERC721 promissory note tranfers the rights to principal-plus-interest and/or collateral, and that
 * they will no longer have a claim on the loan. The ERC721 promissory note itself represents that claim.
 *
 * The borrower can freely transfer and trade this ERC721 obligation receipt as they wish, with the knowledge that
 * transferring the ERC721 obligation receipt tranfers the rights right to pay back the loan and get the collateral
 * back.
 *
 *
 * A loan may end in one of two ways:
 * - First, a borrower may call NFTfi.payBackLoan() and pay back the loan plus interest at any time, in which case they
 * receive their NFT back in the same transaction.
 * - Second, if the loan's duration has passed and the loan has not been paid back yet, a lender can call
 * NFTfi.liquidateOverdueLoan(), in which case they receive the underlying NFT collateral and forfeit the rights to the
 * principal-plus-interest, which the borrower now keeps.
 */
contract AssetOfferLoan is LoanBaseMinimal {
    /* ************* */
    /* CUSTOM ERRORS */
    /* ************* */

    error InvalidLenderSignature();
    error NegativeInterestRate();
    error OriginationFeeIsTooHigh();

    /* *********** */
    /* CONSTRUCTOR */
    /* *********** */

    /**
     * @dev Sets `hub` and permitted erc20-s
     *
     * @param _admin - Initial admin of this contract.
     * @param  _nftfiHub - NFTfiHub address
     * @param  _permittedErc20s - list of permitted ERC20 token contract addresses
     */
    constructor(
        address _admin,
        address _nftfiHub,
        address[] memory _permittedErc20s
    ) LoanBaseMinimal(_admin, _nftfiHub, ContractKeyUtils.getIdFromStringKey("LOAN_COORDINATOR"), _permittedErc20s) {
        // solhint-disable-previous-line no-empty-blocks
    }

    /* ********* */
    /* FUNCTIONS */
    /* ********* */

    /**
     * @notice This function is called by the borrower when accepting a lender's offer to begin a loan.
     *
     * @param _offer - The offer made by the lender.
     * @param _signature - The components of the lender's signature.
     * @return The ID of the created loan.
     */
    function acceptOffer(
        Offer memory _offer,
        Signature memory _signature
    ) external virtual whenNotPaused nonReentrant returns (uint32) {
        address nftWrapper = _getWrapper(_offer.nftCollateralContract);
        _loanSanityChecks(_offer, nftWrapper);

        _loanSanityChecksOffer(_offer);
        return _acceptOffer(_setupLoanTerms(_offer, _signature.signer, nftWrapper), _offer, _signature);
    }

    /* ******************* */
    /* READ-ONLY FUNCTIONS */
    /* ******************* */

    /**
     * @notice This function can be used to view the current quantity of the ERC20 currency used in the specified loan
     * required by the borrower to repay their loan, measured in the smallest unit of the ERC20 currency. Note that
     * since interest accrues every second, once a borrower calls repayLoan(), the amount will have increased slightly.
     *
     * @param _loanId  A unique identifier for this particular loan, sourced from the Loan Coordinator.
     *
     * @return The amount of the specified ERC20 currency required to pay back this loan, measured in the smallest unit
     * of the specified ERC20 currency.
     */
    function getPayoffAmount(uint32 _loanId) external view override returns (uint256) {
        LoanTerms memory loan = loanIdToLoan[_loanId];
        uint256 loanDurationSoFarInSeconds = block.timestamp - uint256(loan.loanStartTime);
        uint256 interestDue = _computeInterestDue(
            loan.loanPrincipalAmount,
            loan.maximumRepaymentAmount,
            loanDurationSoFarInSeconds,
            uint256(loan.loanDuration),
            loan.isProRata
        );

        return (loan.loanPrincipalAmount) + interestDue;
    }

    /* ****************** */
    /* INTERNAL FUNCTIONS */
    /* ****************** */

    /**
     * @notice This function is called by the borrower when accepting a lender's offer to begin a loan.
     *
     * @param _loanTerms - The main Loan Terms struct. This data is saved upon loan creation on loanIdToLoan.
     * @param _offer - The offer made by the lender.
     * @param _signature - The components of the lender's signature.
     * @return The ID of the created loan.
     */
    function _acceptOffer(
        LoanTerms memory _loanTerms,
        Offer memory _offer,
        Signature memory _signature
    ) internal virtual returns (uint32) {
        // Check loan nonces. These are different from Ethereum account nonces.
        // Here, these are uint256 numbers that should uniquely identify
        // each signature for each user (i.e. each user should only create one
        // off-chain signature for each nonce, with a nonce being any arbitrary
        // uint256 value that they have not used yet for an off-chain NFTfi
        // signature).
        ILoanCoordinator(hub.getContract(LOAN_COORDINATOR)).checkAndInvalidateNonce(
            _signature.signer,
            _signature.nonce
        );

        bytes32 offerType = _getOwnOfferType();

        if (!NFTfiSigningUtils.isValidLenderSignature(_offer, _signature, offerType)) {
            revert InvalidLenderSignature();
        }

        uint32 loanId = _createLoan(_loanTerms, msg.sender);

        // Emit an event with all relevant details from this transaction.
        emit LoanStarted(loanId, msg.sender, _signature.signer, _loanTerms);
        return loanId;
    }

    /**
     * @dev Creates a `LoanTerms` struct using data sent as the lender's `_offer` on `acceptOffer`.
     * This is needed in order to avoid stack too deep issues.
     *
     * @param _offer - The offer made by the lender.
     * @param _lender - The address of the lender.
     * @param _nftWrapper - The address of the NFT wrapper contract.
     * @return The `LoanTerms` struct.
     */
    function _setupLoanTerms(
        Offer memory _offer,
        address _lender,
        address _nftWrapper
    ) internal view returns (LoanTerms memory) {
        return
            LoanTerms({
                loanERC20Denomination: _offer.loanERC20Denomination,
                loanPrincipalAmount: _offer.loanPrincipalAmount,
                maximumRepaymentAmount: _offer.maximumRepaymentAmount,
                nftCollateralContract: _offer.nftCollateralContract,
                nftCollateralWrapper: _nftWrapper,
                nftCollateralId: _offer.nftCollateralId,
                loanStartTime: uint64(block.timestamp),
                loanDuration: _offer.loanDuration,
                loanInterestRateForDurationInBasisPoints: uint16(0),
                loanAdminFeeInBasisPoints: adminFeeInBasisPoints,
                borrower: msg.sender,
                lender: _lender,
                escrow: getEscrowAddress(msg.sender),
                isProRata: _offer.isProRata,
                originationFee: _offer.originationFee
            });
    }

    /**
     * @dev Calculates the interest rate for the loan based on principal amount and maximum repayment amount.
     *
     * @param _loanPrincipalAmount - The principal amount of the loan.
     * @param _maximumRepaymentAmount - The maximum repayment amount of the loan.
     * @return The interest rate for the duration of the loan in basis points.
     */
    function _calculateInterestRateForDurationInBasisPoints(
        uint256 _loanPrincipalAmount,
        uint256 _maximumRepaymentAmount,
        bool _isProRata
    ) internal pure returns (uint256) {
        if (!_isProRata) {
            return 0;
        } else {
            uint256 interest = _maximumRepaymentAmount - _loanPrincipalAmount;
            return (interest * HUNDRED_PERCENT) / _loanPrincipalAmount;
        }
    }

    /**
     * @dev Calculates the payoff amount and admin fee for the loan.
     *
     * @param _loan - Struct containing all the loan's parameters.
     * @return adminFee - The admin fee.
     * @return payoffAmount - The payoff amount.
     */
    function _payoffAndFee(
        LoanTerms memory _loan
    ) internal view override returns (uint256 adminFee, uint256 payoffAmount) {
        // Calculate amounts to send to lender and admins
        uint256 interestDue = _computeInterestDue(
            _loan.loanPrincipalAmount,
            _loan.maximumRepaymentAmount,
            block.timestamp - uint256(_loan.loanStartTime),
            uint256(_loan.loanDuration),
            _loan.isProRata
        );
        adminFee = LoanChecksAndCalculations.computeAdminFee(interestDue, uint256(_loan.loanAdminFeeInBasisPoints));
        payoffAmount = ((_loan.loanPrincipalAmount) + interestDue) - adminFee;
    }

    /**
     * @notice A convenience function that calculates the amount of interest currently due for a given loan. The
     * interest is capped at _maximumRepaymentAmount minus _loanPrincipalAmount.
     *
     * @param _loanPrincipalAmount - The total quantity of principal first loaned to the borrower, measured in the
     * smallest units of the ERC20 currency used for the loan.
     * @param _maximumRepaymentAmount - The maximum amount of money that the borrower would be required to retrieve
     * their collateral. If interestIsProRated is set to false, then the borrower will always have to pay this amount to
     * retrieve their collateral.
     * @param _loanDurationSoFarInSeconds - The elapsed time (in seconds) that has occurred so far since the loan began
     * until repayment.
     * @param _loanTotalDurationAgreedTo - The original duration that the borrower and lender agreed to, by which they
     * measured the interest that would be due.
     *
     * @return The quantity of interest due, measured in the smallest units of the ERC20 currency used to pay this loan.
     */
    function _computeInterestDue(
        uint256 _loanPrincipalAmount,
        uint256 _maximumRepaymentAmount,
        uint256 _loanDurationSoFarInSeconds,
        uint256 _loanTotalDurationAgreedTo,
        bool _isProRata
    ) internal pure returns (uint256) {
        // is it fixed?
        if (!_isProRata) {
            return _maximumRepaymentAmount - _loanPrincipalAmount;
        } else {
            uint256 interestDueAfterEntireDurationInBasisPoints = (_loanPrincipalAmount *
                _calculateInterestRateForDurationInBasisPoints(
                    _loanPrincipalAmount,
                    _maximumRepaymentAmount,
                    _isProRata
                ));
            uint256 interestDueAfterElapsedDuration = (interestDueAfterEntireDurationInBasisPoints *
                _loanDurationSoFarInSeconds) /
                _loanTotalDurationAgreedTo /
                uint256(HUNDRED_PERCENT);

            if (_loanPrincipalAmount + interestDueAfterElapsedDuration > _maximumRepaymentAmount) {
                return (_maximumRepaymentAmount - _loanPrincipalAmount);
            } else {
                return interestDueAfterElapsedDuration;
            }
        }
    }

    /**
     * @dev Performs validation checks on loan parameters when accepting an offer.
     *
     * @param _offer - The offer made by the lender.
     */
    function _loanSanityChecksOffer(LoanData.Offer memory _offer) internal pure {
        if (_offer.maximumRepaymentAmount < _offer.loanPrincipalAmount) {
            revert NegativeInterestRate();
        }

        if (_offer.originationFee >= _offer.loanPrincipalAmount) {
            revert OriginationFeeIsTooHigh();
        }
    }
}
