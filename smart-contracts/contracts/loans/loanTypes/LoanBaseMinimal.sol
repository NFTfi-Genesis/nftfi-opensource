// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

import {ILoanBase} from "./ILoanBase.sol";
import {LoanData} from "./LoanData.sol";
import {LoanChecksAndCalculations} from "./LoanChecksAndCalculations.sol";
import {BaseLoan} from "../BaseLoan.sol";
import {NFTfiSigningUtils} from "../../utils/NFTfiSigningUtils.sol";
import {INftfiHub} from "../../interfaces/INftfiHub.sol";
import {ContractKeys} from "../../utils/ContractKeys.sol";
import {ContractKeyUtils} from "../../utils/ContractKeyUtils.sol";
import {ILoanCoordinator} from "../../interfaces/ILoanCoordinator.sol";
import {IPermittedERC20s} from "../../interfaces/IPermittedERC20s.sol";
import {IPermittedNFTs} from "../../interfaces/IPermittedNFTs.sol";
import {IEscrow} from "../../interfaces/IEscrow.sol";
import {IERC20TransferManager} from "../../interfaces/IERC20TransferManager.sol";
import {IPersonalEscrow} from "../../interfaces/IPersonalEscrow.sol";
import {PersonalEscrowFactory} from "../../escrow/PersonalEscrowFactory.sol";
import {INftWrapper} from "../../interfaces/INftWrapper.sol";
import {IDelegateCashPlugin} from "../../interfaces/IDelegateCashPlugin.sol";

import {Address} from "@openzeppelin/contracts/utils/Address.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title  LoanBaseMinimal
 * @author NFTfi
 * @notice Main contract for NFTfi Loan Type. This contract manages the ability to create NFT-backed
 * peer-to-peer loans.
 *
 * There are two ways to commence an NFT-backed loan:
 *
 * a. The borrower accepts a lender's offer by calling `acceptOffer`.
 *   1. the borrower calls nftContract.approveAll(NFTfi), approving the NFTfi contract to move their NFT's on their
 * be1alf.
 *   2. the lender calls erc20Contract.approve(NFTfi), allowing NFTfi to move the lender's ERC20 tokens on their
 * behalf.
 *   3. the lender signs an off-chain message, proposing its offer terms.
 *   4. the borrower calls `acceptOffer` to accept these terms and enter into the loan. The NFT is stored in
 * the contract, the borrower receives the loan principal in the specified ERC20 currency, the lender can mint an
 * NFTfi promissory note (in ERC721 form) that represents the rights to either the principal-plus-interest, or the
 * underlying NFT collateral if the borrower does not pay back in time, and the borrower can mint obligation receipt
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
 * A loan may end in one of two ways:
 * - First, a borrower may call NFTfi.payBackLoan() and pay back the loan plus interest at any time, in which case they
 * receive their NFT back in the same transaction.
 * - Second, if the loan's duration has passed and the loan has not been paid back yet, a lender can call
 * NFTfi.liquidateOverdueLoan(), in which case they receive the underlying NFT collateral and forfeit the rights to the
 * principal-plus-interest, which the borrower now keeps.
 *
 *
 * If the loan was created as a ProRated type loan (pro-rata interest loan), then the user only pays the principal plus
 * pro-rata interest if repaid early.
 * However, if the loan was was created as a Fixed type loan (agreed to be a fixed-repayment loan), then the borrower
 * pays the maximumRepaymentAmount regardless of whether they repay early or not.
 *
 */
abstract contract LoanBaseMinimal is ILoanBase, IPermittedERC20s, BaseLoan, LoanData {
    using SafeERC20 for IERC20;

    /* ******* */
    /* STORAGE */
    /* ******* */

    uint16 public constant HUNDRED_PERCENT = 10000;

    // solhint-disable-next-line immutable-vars-naming
    bytes32 public immutable override LOAN_COORDINATOR;

    /**
     * @notice The maximum duration of any loan started for this loan type, measured in seconds. This is both a
     * sanity-check for borrowers and an upper limit on how long admins will have to support v1 of this contract if they
     * eventually deprecate it, as well as a check to ensure that the loan duration never exceeds the space alotted for
     * it in the loan struct.
     */
    uint256 public override maximumLoanDuration = 365 days * 4;

    /**
     * @notice The percentage of interest earned by lenders on this platform that is taken by the contract admin's as a
     * fee, measured in basis points (hundredths of a percent). The max allowed value is 10000.
     */
    uint16 public override adminFeeInBasisPoints = 500;

    /**
     * @notice A mapping from a loan's identifier to the loan's details, represted by the loan struct.
     */
    mapping(uint32 => LoanTerms) internal loanIdToLoan;

    /**
     * @notice A mapping tracking whether a loan has either been repaid or liquidated. This prevents an attacker trying
     * to repay or liquidate the same loan twice.
     */
    mapping(uint32 => bool) public override loanRepaidOrLiquidated;

    /**
     * @notice A mapping that takes both a user's address and a loan nonce that was first used when signing an off-chain
     * order and checks whether that nonce has previously either been used for a loan, or has been pre-emptively
     * cancelled. The nonce referred to here is not the same as an Ethereum account's nonce. We are referring instead to
     * nonces that are used by both the lender and the borrower when they are first signing off-chain NFTfi orders.
     *
     * These nonces can be any uint256 value that the user has not previously used to sign an off-chain order. Each
     * nonce can be used at most once per user within NFTfi, regardless of whether they are the lender or the borrower
     * in that situation. This serves two purposes. First, it prevents replay attacks where an attacker would submit a
     * user's off-chain order more than once. Second, it allows a user to cancel an off-chain order by calling
     * NFTfi.cancelLoanCommitment(), which marks the nonce as used and prevents any future loan from
     * using the user's off-chain order that contains that nonce.
     */
    mapping(address => mapping(uint256 => bool)) internal _renegotiationNonceHasBeenUsedForUser;

    /**
     * @notice A mapping from an ERC20 currency address to whether that currency
     * is permitted to be used by this contract.
     */
    mapping(address => bool) private erc20Permits;

    // solhint-disable-next-line immutable-vars-naming
    INftfiHub public immutable hub;

    /* ****** */
    /* EVENTS */
    /* ****** */

    /**
     * @notice This event is fired whenever the admins change the percent of interest rates earned that they charge as a
     * fee. Note that newAdminFee can never exceed 10,000, since the fee is measured in basis points.
     *
     * @param  newAdminFee - The new admin fee measured in basis points. This is a percent of the interest paid upon a
     * loan's completion that go to the contract admins.
     */
    event AdminFeeUpdated(uint16 newAdminFee);

    /**
     * @notice This event is fired whenever the admins change the maximum duration of any loan started for this loan
     * type.
     *
     * @param  newMaximumLoanDuration - The new maximum duration.
     */
    event MaximumLoanDurationUpdated(uint256 newMaximumLoanDuration);

    event LoanCreated(
        address indexed nftCollateralContract,
        uint256 indexed nftCollateralId,
        address indexed recipient,
        uint256 loanId
    );

    /**
     * @notice This event is fired whenever a borrower begins a loan by calling NFTfi.beginLoan(), which can only occur
     * after both the lender and borrower have approved their ERC721 and ERC20 contracts to use NFTfi, and when they
     * both have signed off-chain messages that agree on the terms of the loan.
     *
     * @param  loanId - A unique identifier for this particular loan, sourced from the Loan Coordinator.
     * @param  borrower - The address of the borrower.
     * @param  lender - The address of the lender. The lender can change their address by transferring the NFTfi ERC721
     * token that they received when the loan began.
     */
    event LoanStarted(uint32 indexed loanId, address indexed borrower, address indexed lender, LoanTerms loanTerms);

    /**
     * @notice This event is fired whenever a borrower successfully repays their loan, paying
     * principal-plus-interest-minus-fee to the lender in loanERC20Denomination, paying fee to owner in
     * loanERC20Denomination, and receiving their NFT collateral back.
     *
     * @param  loanId - A unique identifier for this particular loan, sourced from the Loan Coordinator.
     * @param  borrower - The address of the borrower.
     * @param  lender - The address of the lender. The lender can change their address by transferring the NFTfi ERC721
     * token that they received when the loan began.
     * @param  loanPrincipalAmount - The original sum of money transferred from lender to borrower at the beginning of
     * the loan, measured in loanERC20Denomination's smallest units.
     * @param  nftCollateralId - The ID within the NFTCollateralContract for the NFT being used as collateral for this
     * loan. The NFT is stored within this contract during the duration of the loan.
     * @param  amountPaidToLender The amount of ERC20 that the borrower paid to the lender, measured in the smalled
     * units of loanERC20Denomination.
     * @param  adminFee The amount of interest paid to the contract admins, measured in the smalled units of
     * loanERC20Denomination and determined by adminFeeInBasisPoints. This amount never exceeds the amount of interest
     * earned.
     * @param  nftCollateralContract - The ERC721 contract of the NFT collateral
     * @param  loanERC20Denomination - The ERC20 contract of the currency being used as principal/interest for this
     * loan.
     */
    event LoanRepaid(
        uint32 indexed loanId,
        address indexed borrower,
        address indexed lender,
        uint256 loanPrincipalAmount,
        uint256 nftCollateralId,
        uint256 amountPaidToLender,
        uint256 adminFee,
        address nftCollateralContract,
        address loanERC20Denomination
    );

    /**
     * @notice This event is fired whenever a lender liquidates an outstanding loan that is owned to them that has
     * exceeded its duration. The lender receives the underlying NFT collateral, and the borrower no longer needs to
     * repay the loan principal-plus-interest.
     *
     * @param  loanId - A unique identifier for this particular loan, sourced from the Loan Coordinator.
     * @param  borrower - The address of the borrower.
     * @param  lender - The address of the lender. The lender can change their address by transferring the NFTfi ERC721
     * token that they received when the loan began.
     * @param  loanPrincipalAmount - The original sum of money transferred from lender to borrower at the beginning of
     * the loan, measured in loanERC20Denomination's smallest units.
     * @param  nftCollateralId - The ID within the NFTCollateralContract for the NFT being used as collateral for this
     * loan. The NFT is stored within this contract during the duration of the loan.
     * @param  loanMaturityDate - The unix time (measured in seconds) that the loan became due and was eligible for
     * liquidation.
     * @param  loanLiquidationDate - The unix time (measured in seconds) that liquidation occurred.
     * @param  nftCollateralContract - The ERC721 contract of the NFT collateral
     */
    event LoanLiquidated(
        uint32 indexed loanId,
        address indexed borrower,
        address indexed lender,
        uint256 loanPrincipalAmount,
        uint256 nftCollateralId,
        uint256 loanMaturityDate,
        uint256 loanLiquidationDate,
        address nftCollateralContract
    );

    /**
     * @notice This event is fired when some of the terms of a loan are being renegotiated.
     *
     * @param loanId - The unique identifier for the loan to be renegotiated
     * @param newLoanDuration - The new amount of time (measured in seconds) that can elapse before the lender can
     * liquidate the loan and seize the underlying collateral NFT.
     * @param newMaximumRepaymentAmount - The new maximum amount of money that the borrower would be required to
     * retrieve their collateral, measured in the smallest units of the ERC20 currency used for the loan. The
     * borrower will always have to pay this amount to retrieve their collateral, regardless of whether they repay
     * early.
     * @param renegotiationFee Agreed upon fee in loan denomination that borrower pays for the lender for the
     * renegotiation, has to be paid with an ERC20 transfer loanERC20Denomination token, uses transfer from,
     * frontend will have to prompt an erc20 approve for this from the borrower to the lender
     * @param renegotiationAdminFee renegotiationFee admin portion based on determined by adminFeeInBasisPoints
     * @param isProRata - indicates if a renegotiated loan is pro-rata or fixed
     */
    event LoanRenegotiated(
        uint32 indexed loanId,
        address indexed borrower,
        address indexed lender,
        uint32 newLoanDuration,
        uint256 newMaximumRepaymentAmount,
        uint256 renegotiationFee,
        uint256 renegotiationAdminFee,
        bool isProRata
    );

    /**
     * @notice This event is fired whenever the admin sets a ERC20 permit.
     *
     * @param erc20Contract - Address of the ERC20 contract.
     * @param isPermitted - Signals ERC20 permit.
     */
    event ERC20Permit(address indexed erc20Contract, bool isPermitted);

    /* ************* */
    /* CUSTOM ERRORS */
    /* ************* */

    error LoanDurationOverflow();
    error BasisPointsTooHigh();
    error NoTokensOwned();
    error FunctionInformationArityMismatch();
    error TokenIsCollateral();
    error SenderNotBorrower();
    error SenderNotLender();
    error NoTokensInEscrow();
    error LoanAlreadyRepaidOrLiquidated();
    error LoanNotOverdueYet();
    error OnlyLenderCanLiquidate();
    error InvalidNonce();
    error RenegotiationSignatureInvalid();
    error ERC20ZeroAddress();
    error CurrencyDenominationNotPermitted();
    error NFTCollateralContractNotPermitted();
    error LoanDurationExceedsMaximum();
    error LoanDurationCannotBeZero();
    error ZeroPrincipal();
    error DelegationExists();

    /* *********** */
    /* CONSTRUCTOR */
    /* *********** */

    /**
     * @dev Sets `hub`
     *
     * @param _admin - Initial admin of this contract.
     * @param  _nftfiHub - NFTfiHub address
     * @param  _loanCoordinatorKey -
     * @param  _permittedErc20s -
     */
    constructor(
        address _admin,
        address _nftfiHub,
        bytes32 _loanCoordinatorKey,
        address[] memory _permittedErc20s
    ) BaseLoan(_admin) {
        hub = INftfiHub(_nftfiHub);
        LOAN_COORDINATOR = _loanCoordinatorKey;
        for (uint256 i; i < _permittedErc20s.length; ++i) {
            _setERC20Permit(_permittedErc20s[i], true);
        }
    }

    /* *************** */
    /* ADMIN FUNCTIONS */
    /* *************** */

    /**
     * @notice This function can be called by admins to change the maximumLoanDuration. Note that they can never change
     * maximumLoanDuration to be greater than UINT32_MAX, since that's the maximum space alotted for the duration in the
     * loan struct.
     *
     * @param _newMaximumLoanDuration - The new maximum loan duration, measured in seconds.
     */
    function updateMaximumLoanDuration(uint256 _newMaximumLoanDuration) external onlyOwner {
        if (_newMaximumLoanDuration > uint256(type(uint32).max)) {
            revert LoanDurationOverflow();
        }
        maximumLoanDuration = _newMaximumLoanDuration;
        emit MaximumLoanDurationUpdated(_newMaximumLoanDuration);
    }

    /**
     * @notice This function can be called by admins to change the percent of interest rates earned that they charge as
     * a fee. Note that newAdminFee can never exceed 10,000, since the fee is measured in basis points.
     *
     * @param _newAdminFeeInBasisPoints - The new admin fee measured in basis points. This is a percent of the interest
     * paid upon a loan's completion that go to the contract admins.
     */
    function updateAdminFee(uint16 _newAdminFeeInBasisPoints) external onlyOwner {
        if (_newAdminFeeInBasisPoints > HUNDRED_PERCENT) {
            revert BasisPointsTooHigh();
        }
        adminFeeInBasisPoints = _newAdminFeeInBasisPoints;
        emit AdminFeeUpdated(_newAdminFeeInBasisPoints);
    }

    /**
     * @notice used by the owner account to be able to drain stuck NFTs
     * @param _tokenAddress - address of the token contract for the token to be sent out
     * @param _tokenId - id token to be sent out
     * @param _receiver - receiver of the token
     */
    function drainNFT(
        string memory _nftType,
        address _tokenAddress,
        uint256 _tokenId,
        address _receiver
    ) external onlyOwner {
        bytes32 nftTypeKey = ContractKeyUtils.getIdFromStringKey(_nftType);
        address transferWrapper = IPermittedNFTs(hub.getContract(ContractKeys.PERMITTED_NFTS)).getNftTypeWrapper(
            nftTypeKey
        );
        _transferNFT(transferWrapper, _tokenAddress, _tokenId, address(this), _receiver);
    }

    /**
     * @notice This function can be called by admins to change the permitted status of an ERC20 currency. This includes
     * both adding an ERC20 currency to the permitted list and removing it.
     *
     * @param _erc20 - The address of the ERC20 currency whose permit list status changed.
     * @param _permit - The new status of whether the currency is permitted or not.
     */
    function setERC20Permit(address _erc20, bool _permit) external onlyOwner {
        _setERC20Permit(_erc20, _permit);
    }

    /**
     * @notice This function can be called by admins to change the permitted status of a batch of ERC20 currency. This
     * includes both adding an ERC20 currency to the permitted list and removing it.
     *
     * @param _erc20s - The addresses of the ERC20 currencies whose permit list status changed.
     * @param _permits - The new statuses of whether the currency is permitted or not.
     */
    function setERC20Permits(address[] memory _erc20s, bool[] memory _permits) external onlyOwner {
        if (_erc20s.length != _permits.length) {
            revert FunctionInformationArityMismatch();
        }
        for (uint256 i = 0; i < _erc20s.length; ++i) {
            _setERC20Permit(_erc20s[i], _permits[i]);
        }
    }

    /**
     * @notice Mints the obligation receipt for the borrower
     *
     * @param _loanId - The unique identifier for the loan.
     */
    function mintObligationReceipt(uint32 _loanId) external nonReentrant {
        LoanTerms memory loan = loanIdToLoan[_loanId];
        address borrower = loan.borrower;
        if (msg.sender != borrower) {
            revert SenderNotBorrower();
        }

        _checkDelegationAndUndelegate(_loanId);
        // check if colateral is in personal escrow, if yes, we need to move it to global,
        // because obligation receipt can change borrower and personal escrow is tied to one borrower
        if (
            PersonalEscrowFactory(hub.getContract(ContractKeys.PERSONAL_ESCROW_FACTORY)).isPersonalEscrow(loan.escrow)
        ) {
            _moveCollateralToGlobalEscrow(_loanId, loan);
        }

        ILoanCoordinator loanCoordinator = ILoanCoordinator(hub.getContract(LOAN_COORDINATOR));
        loanCoordinator.mintObligationReceipt(_loanId, borrower);

        delete loanIdToLoan[_loanId].borrower;
    }

    /**
     * @notice Internal function to move collateral of the loan from personal tok global escrow,
     * will only work if loan collateral is in personal escrow
     *
     * @param _loanId - The unique identifier for the loan.
     * @param _loan loan terms
     */
    function _moveCollateralToGlobalEscrow(uint32 _loanId, LoanTerms memory _loan) internal {
        address globalEscrow = hub.getContract(ContractKeys.ESCROW);
        IPersonalEscrow(_loan.escrow).handOverCollateralToEscrow(
            _loan.nftCollateralWrapper,
            _loan.nftCollateralContract,
            _loan.nftCollateralId,
            globalEscrow
        );
        IEscrow(globalEscrow).lockCollateral(
            _loan.nftCollateralWrapper,
            _loan.nftCollateralContract,
            _loan.nftCollateralId,
            _loan.escrow
        );
        loanIdToLoan[_loanId].escrow = globalEscrow;
    }

    /**
     * @notice Mints the promissory note for the lender
     *
     * @param _loanId - The unique identifier for the loan.
     */
    function mintPromissoryNote(uint32 _loanId) external nonReentrant {
        address lender = loanIdToLoan[_loanId].lender;
        if (msg.sender != lender) {
            revert SenderNotLender();
        }
        ILoanCoordinator loanCoordinator = ILoanCoordinator(hub.getContract(LOAN_COORDINATOR));
        loanCoordinator.mintPromissoryNote(_loanId, lender);

        delete loanIdToLoan[_loanId].lender;
    }

    /**
     * @dev makes possible to change loan duration and max repayment amount, loan duration even can be extended if
     * loan was expired but not liquidated.
     *
     * @param _loanId - The unique identifier for the loan to be renegotiated
     * @param _newLoanDuration - The new amount of time (measured in seconds) that can elapse before the lender can
     * liquidate the loan and seize the underlying collateral NFT.
     * @param _newMaximumRepaymentAmount - The new maximum amount of money that the borrower would be required to
     * retrieve their collateral, measured in the smallest units of the ERC20 currency used for the loan. The
     * borrower will always have to pay this amount to retrieve their collateral, regardless of whether they repay
     * early.
     * @param _renegotiationFee Agreed upon fee in ether that borrower pays for the lender for the renegitiation
     * @param _lenderNonce - The nonce referred to here is not the same as an Ethereum account's nonce. We are
     * referring instead to nonces that are used by both the lender and the borrower when they are first signing
     * off-chain NFTfi orders. These nonces can be any uint256 value that the user has not previously used to sign an
     * off-chain order. Each nonce can be used at most once per user within NFTfi, regardless of whether they are the
     * lender or the borrower in that situation. This serves two purposes:
     * - First, it prevents replay attacks where an attacker would submit a user's off-chain order more than once.
     * - Second, it allows a user to cancel an off-chain order by calling NFTfi.cancelLoanCommitment()
     * , which marks the nonce as used and prevents any future loan from using the user's off-chain order that contains
     * that nonce.
     * @param _expiry - The date when the renegotiation offer expires
     * @param _isProRata - indicates if a renegotiated loan is pro-rata or fixed
     * @param _lenderSignature - The ECDSA signature of the lender, obtained off-chain ahead of time, signing the
     * following combination of parameters:
     * - _loanId
     * - _newLoanDuration
     * - _isProRata
     * - _newMaximumRepaymentAmount
     * - _renegotiationFee
     * - _lender
     * - _nonce
     * - _expiry
     * - address of this contract
     * - chainId
     */
    function renegotiateLoan(
        uint32 _loanId,
        uint32 _newLoanDuration,
        uint256 _newMaximumRepaymentAmount,
        uint256 _renegotiationFee,
        uint256 _lenderNonce,
        uint256 _expiry,
        bool _isProRata,
        bytes memory _lenderSignature
    ) external whenNotPaused nonReentrant {
        _renegotiateLoan(
            _loanId,
            _newLoanDuration,
            _newMaximumRepaymentAmount,
            _renegotiationFee,
            _lenderNonce,
            _expiry,
            _isProRata,
            _lenderSignature
        );
    }

    /**
     * @notice This function is called by a anyone to repay a loan. It can be called at any time after the loan has
     * begun and before loan expiry.. The caller will pay a pro-rata portion of their interest if the loan is paid off
     * early and the loan is pro-rated type, but the complete repayment amount if it is fixed type.
     * The the borrower (current owner of the obligation note) will get the collaterl NFT back.
     *
     * This function is purposefully not pausable in order to prevent an attack where the contract admin's pause the
     * contract and hold hostage the NFT's that are still within it.
     *
     * @param _loanId  A unique identifier for this particular loan, sourced from the Loan Coordinator.
     */
    function payBackLoan(uint32 _loanId) external nonReentrant {
        LoanChecksAndCalculations.payBackChecks(_loanId, hub);
        (
            address borrower,
            address lender,
            LoanTerms memory loan,
            ILoanCoordinator loanCoordinator
        ) = _getPartiesAndData(_loanId);

        _payBackLoan(_loanId, borrower, lender, loan);

        bool repaid = true;
        _resolveLoanState(_loanId, loanCoordinator, repaid);
        _resolveLoanCollateralPayback(borrower, loan);
        _checkDelegationAndUndelegate(_loanId);
    }

    /**
     * @notice This function is called by a anyone to repay a loan. It can be called at any time after the loan has
     * begun and before loan expiry.. The caller will pay a pro-rata portion of their interest if the loan is paid off
     * early and the loan is pro-rated type, but the complete repayment amount if it is fixed type.
     * The the borrower (current owner of the obligation note) will get the collaterl NFT back.
     *
     * This function is purposefully not pausable in order to prevent an attack where the contract admin's pause the
     * contract and hold hostage the NFT's that are still within it.
     *
     * @param _loanId  A unique identifier for this particular loan, sourced from the Loan Coordinator.
     */
    function payBackLoanSafe(uint32 _loanId) external nonReentrant {
        LoanChecksAndCalculations.payBackChecks(_loanId, hub);
        (
            address borrower,
            address lender,
            LoanTerms memory loan,
            ILoanCoordinator loanCoordinator
        ) = _getPartiesAndData(_loanId);

        _payBackLoanSafe(_loanId, borrower, lender, loan);

        bool repaid = true;
        _resolveLoanState(_loanId, loanCoordinator, repaid);
        _resolveLoanCollateralPayback(borrower, loan);
        _checkDelegationAndUndelegate(_loanId);
    }

    /**
     * @notice This function is called by a lender once a loan has finished its duration and the borrower still has not
     * repaid. The lender can call this function to seize the underlying NFT collateral, although the lender gives up
     * all rights to the principal-plus-collateral by doing so.
     *
     * This function is purposefully not pausable in order to prevent an attack where the contract admin's pause
     * the contract and hold hostage the NFT's that are still within it.
     *
     * @param _loanId  A unique identifier for this particular loan, sourced from the Loan Coordinator.
     */
    function liquidateOverdueLoan(uint32 _loanId) external nonReentrant {
        LoanChecksAndCalculations.checkLoanIdValidity(_loanId, hub);
        // Sanity check that payBackLoan() and liquidateOverdueLoan() have never been called on this loanId.
        // Depending on how the rest of the code turns out, this check may be unnecessary.
        if (loanRepaidOrLiquidated[_loanId]) {
            revert LoanAlreadyRepaidOrLiquidated();
        }

        (
            address borrower,
            address lender,
            LoanTerms memory loan,
            ILoanCoordinator loanCoordinator
        ) = _getPartiesAndData(_loanId);

        // Ensure that the loan is indeed overdue, since we can only liquidate overdue loans.
        uint256 loanMaturityDate = uint256(loan.loanStartTime) + uint256(loan.loanDuration);
        if (block.timestamp <= loanMaturityDate) {
            revert LoanNotOverdueYet();
        }
        if (msg.sender != lender) {
            revert OnlyLenderCanLiquidate();
        }

        bool repaid = false;
        _resolveLoanState(_loanId, loanCoordinator, repaid);
        _resolveLoanCollateralLiquidate(lender, loan);
        _checkDelegationAndUndelegate(_loanId);

        // Emit an event with all relevant details from this transaction.
        emit LoanLiquidated(
            _loanId,
            borrower,
            lender,
            loan.loanPrincipalAmount,
            loan.nftCollateralId,
            loanMaturityDate,
            block.timestamp,
            loan.nftCollateralContract
        );
    }

    /**
     * @notice This function can be called by either a lender or a borrower to cancel all off-chain orders that they
     * have signed that contain this nonce. If the off-chain orders were created correctly, there should only be one
     * off-chain order that contains this nonce at all.
     *
     * The nonce referred to here is not the same as an Ethereum account's nonce. We are referring
     * instead to nonces that are used by both the lender and the borrower when they are first signing off-chain NFTfi
     * orders. These nonces can be any uint256 value that the user has not previously used to sign an off-chain order.
     * Each nonce can be used at most once per user within NFTfi, regardless of whether they are the lender or the
     * borrower in that situation. This serves two purposes. First, it prevents replay attacks where an attacker would
     * submit a user's off-chain order more than once. Second, it allows a user to cancel an off-chain order by calling
     * NFTfi.cancelLoanCommitment(), which marks the nonce as used and prevents any future loan from
     * using the user's off-chain order that contains that nonce.
     *
     * @param  _nonce - User nonce
     */
    function cancelRefinancingCommitment(uint256 _nonce) external {
        if (_renegotiationNonceHasBeenUsedForUser[msg.sender][_nonce]) {
            revert InvalidNonce();
        }
        _renegotiationNonceHasBeenUsedForUser[msg.sender][_nonce] = true;
    }

    /* ******************* */
    /* READ-ONLY FUNCTIONS */
    /* ******************* */

    function getLoanTerms(uint32 _loanId) public view override returns (LoanTerms memory) {
        LoanTerms memory loan = loanIdToLoan[_loanId];
        return loan;
    }

    /**
     * @notice This function can be used to view the current quantity of the ERC20 currency used in the specified loan
     * required by the borrower to repay their loan, measured in the smallest unit of the ERC20 currency.
     *
     * @param _loanId  A unique identifier for this particular loan, sourced from the Loan Coordinator.
     *
     * @return The amount of the specified ERC20 currency required to pay back this loan, measured in the smallest unit
     * of the specified ERC20 currency.
     */
    function getPayoffAmount(uint32 _loanId) external view virtual returns (uint256);

    /**
     * @notice This function can be used to view whether a particular nonce for a particular user has already been used,
     * either from a successful loan or a cancelled off-chain order.
     *
     * @param _user - The address of the user. This function works for both lenders and borrowers alike.
     * @param  _nonce - The nonce referred to here is not the same as an Ethereum account's nonce. We are referring
     * instead to nonces that are used by both the lender and the borrower when they are first signing off-chain
     * NFTfi orders. These nonces can be any uint256 value that the user has not previously used to sign an off-chain
     * order. Each nonce can be used at most once per user within NFTfi, regardless of whether they are the lender or
     * the borrower in that situation. This serves two purposes:
     * - First, it prevents replay attacks where an attacker would submit a user's off-chain order more than once.
     * - Second, it allows a user to cancel an off-chain order by calling NFTfi.cancelLoanCommitment()
     * , which marks the nonce as used and prevents any future loan from using the user's off-chain order that contains
     * that nonce.
     *
     * @return A bool representing whether or not this nonce has been used for this user.
     */
    function getWhetherRenegotiationNonceHasBeenUsedForUser(
        address _user,
        uint256 _nonce
    ) external view override returns (bool) {
        return _renegotiationNonceHasBeenUsedForUser[_user][_nonce];
    }

    /**
     * @notice This function can be called by anyone to get the permit associated with the erc20 contract.
     *
     * @param _erc20 - The address of the erc20 contract.
     *
     * @return Returns whether the erc20 is permitted
     */
    function getERC20Permit(address _erc20) public view override returns (bool) {
        return erc20Permits[_erc20];
    }

    /* ****************** */
    /* INTERNAL FUNCTIONS */
    /* ****************** */

    /**
     * @dev makes possible to change loan duration and max repayment amount, loan duration even can be extended if
     * loan was expired but not liquidated. IMPORTANT: Frontend will have to propt the caller to do an ERC20 approve for
     * the fee amount from themselves (borrower/obligation reciept holder) to the lender (promissory note holder)
     *
     * @param _loanId - The unique identifier for the loan to be renegotiated
     * @param _newLoanDuration - The new amount of time (measured in seconds) that can elapse before the lender can
     * liquidate the loan and seize the underlying collateral NFT.
     * @param _newMaximumRepaymentAmount - The new maximum amount of money that the borrower would be required to
     * retrieve their collateral, measured in the smallest units of the ERC20 currency used for the loan. The
     * borrower will always have to pay this amount to retrieve their collateral, regardless of whether they repay
     * early.
     * @param _renegotiationFee Agreed upon fee in loan denomination that borrower pays for the lender and
     * the admin for the renegotiation, has to be paid with an ERC20 transfer loanERC20Denomination token,
     * uses transfer from, frontend will have to prompt an erc20 approve for this from the borrower to the lender,
     * admin fee is calculated by the loan's loanAdminFeeInBasisPoints value
     * @param _lenderNonce - The nonce referred to here is not the same as an Ethereum account's nonce. We are
     * referring instead to nonces that are used by both the lender and the borrower when they are first signing
     * off-chain NFTfi orders. These nonces can be any uint256 value that the user has not previously used to sign an
     * off-chain order. Each nonce can be used at most once per user within NFTfi, regardless of whether they are the
     * lender or the borrower in that situation. This serves two purposes:
     * - First, it prevents replay attacks where an attacker would submit a user's off-chain order more than once.
     * - Second, it allows a user to cancel an off-chain order by calling NFTfi.cancelLoanCommitment()
     , which marks the nonce as used and prevents any future loan from using the user's off-chain order that contains
     * that nonce.
     * @param _expiry - The date when the renegotiation offer expires
     * @param _lenderSignature - The ECDSA signature of the lender, obtained off-chain ahead of time, signing the
     * following combination of parameters:
     * - _loanId
     * - _newLoanDuration
     * - _isProRata
     * - _newMaximumRepaymentAmount
     * - _renegotiationFee
     * - _lender
     * - _nonce
     * - _expiry
     * - address of this contract
     * - chainId
     */
    function _renegotiateLoan(
        uint32 _loanId,
        uint32 _newLoanDuration,
        uint256 _newMaximumRepaymentAmount,
        uint256 _renegotiationFee,
        uint256 _lenderNonce,
        uint256 _expiry,
        bool _isProRata,
        bytes memory _lenderSignature
    ) internal {
        LoanTerms storage loan = loanIdToLoan[_loanId];

        (address borrower, address lender) = LoanChecksAndCalculations.renegotiationChecks(
            loan,
            _loanId,
            _newLoanDuration,
            _newMaximumRepaymentAmount,
            _lenderNonce,
            hub
        );

        //invalidation after check inside previous call
        _renegotiationNonceHasBeenUsedForUser[lender][_lenderNonce] = true;

        if (
            !NFTfiSigningUtils.isValidLenderRenegotiationSignature(
                _loanId,
                _newLoanDuration,
                _isProRata,
                _newMaximumRepaymentAmount,
                _renegotiationFee,
                Signature({signer: lender, nonce: _lenderNonce, expiry: _expiry, signature: _lenderSignature})
            )
        ) {
            revert RenegotiationSignatureInvalid();
        }

        uint256 renegotiationAdminFee;
        /**
         * @notice Transfers fee to the lender immediately
         * @dev implements Checks-Effects-Interactions pattern by modifying state only after
         * the transfer happened successfully, we also add the nonReentrant modifier to
         * the pbulic versions
         */
        if (_renegotiationFee > 0) {
            renegotiationAdminFee = LoanChecksAndCalculations.computeAdminFee(
                _renegotiationFee,
                loan.loanAdminFeeInBasisPoints
            );
            // Transfer principal-plus-interest-minus-fees from the caller (always has to be borrower) to lender

            IERC20TransferManager erc20TransferManager = IERC20TransferManager(
                hub.getContract(ContractKeys.ERC20_TRANSFER_MANAGER)
            );

            erc20TransferManager.transfer(
                loan.loanERC20Denomination,
                borrower,
                lender,
                _renegotiationFee - renegotiationAdminFee
            );
            // Transfer fees from the caller (always has to be borrower) to admins
            erc20TransferManager.transfer(loan.loanERC20Denomination, borrower, owner(), renegotiationAdminFee);
        }

        loan.loanDuration = _newLoanDuration;
        loan.maximumRepaymentAmount = _newMaximumRepaymentAmount;
        loan.isProRata = _isProRata;

        // we have to reinstate borrower record here, because obligation receipt gets deleted in reMint
        if (loan.borrower == address(0) || loan.lender == address(0)) {
            ILoanCoordinator(hub.getContract(LOAN_COORDINATOR)).resetSmartNfts(_loanId);

            if (loan.borrower == address(0)) {
                loan.borrower = borrower;
            }
            if (loan.lender == address(0)) {
                loan.lender = lender;
            }
        }

        emit LoanRenegotiated(
            _loanId,
            borrower,
            lender,
            _newLoanDuration,
            _newMaximumRepaymentAmount,
            _renegotiationFee,
            renegotiationAdminFee,
            _isProRata
        );
    }

    function getEscrowAddress(address _borrower) public view returns (address) {
        address personalEscrow = PersonalEscrowFactory(hub.getContract(ContractKeys.PERSONAL_ESCROW_FACTORY))
            .personalEscrowOfOwner(_borrower);
        if (personalEscrow != address(0)) {
            return personalEscrow;
        } else {
            return hub.getContract(ContractKeys.ESCROW);
        }
    }

    /**
     * @dev Transfer collateral NFT from borrower to this contract and principal from lender to the borrower and
     * registers the new loan through the loan coordinator.
     *
     * @param _loanTerms - Struct containing the loan's settings
     */
    function _createLoan(LoanTerms memory _loanTerms, address _borrower) internal returns (uint32) {
        IEscrow(_loanTerms.escrow).lockCollateral(
            _loanTerms.nftCollateralWrapper,
            _loanTerms.nftCollateralContract,
            _loanTerms.nftCollateralId,
            _borrower
        );

        uint32 loanId = _createLoanNoNftTransfer(_loanTerms, _borrower);

        return loanId;
    }

    /**
     * @dev Transfer principal from lender to the borrower and
     * registers the new loan through the loan coordinator.
     *
     * @param _loanTerms - Struct containing the loan's settings
     */
    function _createLoanNoNftTransfer(LoanTerms memory _loanTerms, address _borrower) internal returns (uint32 loanId) {
        // Issue an ERC721 promissory note to the lender that gives them the
        // right to either the principal-plus-interest or the collateral,
        // and an obligation note to the borrower that gives them the
        // right to pay back the loan and get the collateral back.
        ILoanCoordinator loanCoordinator = ILoanCoordinator(hub.getContract(LOAN_COORDINATOR));
        loanId = loanCoordinator.registerLoan();

        // Add the loan to storage before moving collateral/principal to follow
        // the Checks-Effects-Interactions pattern.
        loanIdToLoan[loanId] = _loanTerms;

        // Transfer principal from lender to borrower leaving origination fee.
        IERC20TransferManager(hub.getContract(ContractKeys.ERC20_TRANSFER_MANAGER)).transfer(
            _loanTerms.loanERC20Denomination,
            _loanTerms.lender,
            _borrower,
            _loanTerms.loanPrincipalAmount - _loanTerms.originationFee
        );

        emit LoanCreated(_loanTerms.nftCollateralContract, _loanTerms.nftCollateralId, _borrower, loanId);

        return loanId;
    }

    /**
     * @notice This function is called by a anyone to repay a loan. It can be called at any time after the loan has
     * begun and before loan expiry.. The caller will pay a pro-rata portion of their interest if the loan is paid off
     * early and the loan is pro-rated type, but the complete repayment amount if it is fixed type.
     * The the borrower (current owner of the obligation note) will get the collaterl NFT back.
     *
     * This function is purposefully not pausable in order to prevent an attack where the contract admin's pause the
     * contract and hold hostage the NFT's that are still within it.
     *
     * @param _loanId  A unique identifier for this particular loan, sourced from the Loan Coordinator.
     */
    function _payBackLoan(uint32 _loanId, address _borrower, address _lender, LoanTerms memory _loan) internal {
        // Fetch loan details from storage, but store them in memory for the sake of saving gas.

        (uint256 adminFee, uint256 payoffAmount) = _payoffAndFee(_loan);

        IERC20TransferManager erc20TransferManager = IERC20TransferManager(
            hub.getContract(ContractKeys.ERC20_TRANSFER_MANAGER)
        );

        // Transfer principal-plus-interest-minus-fees from the caller to lender
        erc20TransferManager.transfer(_loan.loanERC20Denomination, msg.sender, _lender, payoffAmount);
        // Transfer fees from the caller to admins
        erc20TransferManager.transfer(_loan.loanERC20Denomination, msg.sender, owner(), adminFee);

        // Emit an event with all relevant details from this transaction.
        emit LoanRepaid(
            _loanId,
            _borrower,
            _lender,
            _loan.loanPrincipalAmount,
            _loan.nftCollateralId,
            payoffAmount,
            adminFee,
            _loan.nftCollateralContract,
            _loan.loanERC20Denomination
        );
    }

    /**
     * @notice This function is called by a anyone to repay a loan. It can be called at any time after the loan has
     * begun and before loan expiry.. The caller will pay a pro-rata portion of their interest if the loan is paid off
     * early and the loan is pro-rated type, but the complete repayment amount if it is fixed type.
     * The the borrower (current owner of the obligation note) will get the collaterl NFT back.
     *
     * This function is purposefully not pausable in order to prevent an attack where the contract admin's pause the
     * contract and hold hostage the NFT's that are still within it.
     *
     * @param _loanId  A unique identifier for this particular loan, sourced from the Loan Coordinator.
     */
    function _payBackLoanSafe(uint32 _loanId, address _borrower, address _lender, LoanTerms memory _loan) internal {
        // Fetch loan details from storage, but store them in memory for the sake of saving gas.

        (uint256 adminFee, uint256 payoffAmount) = _payoffAndFee(_loan);

        IERC20TransferManager erc20TransferManager = IERC20TransferManager(
            hub.getContract(ContractKeys.ERC20_TRANSFER_MANAGER)
        );

        // Transfer principal-plus-interest-minus-fees from the caller to lender
        erc20TransferManager.safeLoanPaybackTransfer(_loan.loanERC20Denomination, msg.sender, _lender, payoffAmount);
        // Transfer fees from the caller to admins
        erc20TransferManager.safeAdminFeeTransfer(_loan.loanERC20Denomination, msg.sender, owner(), adminFee);

        // Emit an event with all relevant details from this transaction.
        emit LoanRepaid(
            _loanId,
            _borrower,
            _lender,
            _loan.loanPrincipalAmount,
            _loan.nftCollateralId,
            payoffAmount,
            adminFee,
            _loan.nftCollateralContract,
            _loan.loanERC20Denomination
        );
    }

    /**
     * @dev Transfers several types of NFTs using a wrapper that knows how to handle each case.
     *
     * @param _sender - Current owner of the NFT
     * @param _recipient - Recipient of the transfer
     */
    function _transferNFT(
        address _nftCollateralWrapper,
        address _nftCollateralContract,
        uint256 _nftCollateralId,
        address _sender,
        address _recipient
    ) internal {
        Address.functionDelegateCall(
            _nftCollateralWrapper,
            abi.encodeWithSelector(
                INftWrapper(_nftCollateralWrapper).transferNFT.selector,
                _sender,
                _recipient,
                _nftCollateralContract,
                _nftCollateralId
            ),
            "NFT not successfully transferred"
        );
    }

    function _isOwner(
        address _nftCollateralWrapper,
        address _nftCollateralContract,
        uint256 _nftCollateralId,
        address _owner
    ) internal returns (bool) {
        bytes memory result = Address.functionDelegateCall(
            _nftCollateralWrapper,
            abi.encodeWithSelector(
                INftWrapper(_nftCollateralWrapper).isOwner.selector,
                _owner,
                _nftCollateralContract,
                _nftCollateralId
            ),
            "Ownership check failed"
        );
        return abi.decode(result, (bool));
    }

    /**
     * @notice A convenience function with shared functionality between `payBackLoan` and `liquidateOverdueLoan`.
     *
     * @param _borrower - The receiver of the collateral nft. The borrower when `payBackLoan` or the lender when
     * `liquidateOverdueLoan`.
     * @param _loanTerms - The main Loan Terms struct. This data is saved upon loan creation on loanIdToLoan.
     */
    function _resolveLoanCollateralPayback(address _borrower, LoanTerms memory _loanTerms) internal {
        address collateralContract = _loanTerms.nftCollateralContract;
        uint256 collateralId = _loanTerms.nftCollateralId;

        address escrow = _loanTerms.escrow;
        if (PersonalEscrowFactory(hub.getContract(ContractKeys.PERSONAL_ESCROW_FACTORY)).isPersonalEscrow(escrow)) {
            // borrower has a personal escrow, and the collateral is in it
            IPersonalEscrow(escrow).unlockAndKeepCollateral(collateralContract, collateralId);
        } else {
            IEscrow(escrow).unlockCollateral(
                _loanTerms.nftCollateralWrapper,
                collateralContract,
                collateralId,
                _borrower
            );
        }

        // invariant check here if collateral landed where it should have
    }

    /**
     * @notice A convenience function with shared functionality between `payBackLoan` and `liquidateOverdueLoan`.
     *
     * @param _loanTerms - The main Loan Terms struct. This data is saved upon loan creation on loanIdToLoan.
     */
    function _resolveLoanCollateralLiquidate(address _lender, LoanTerms memory _loanTerms) internal {
        // Transfer collateral from this contract to the lender, since the lender is seizing collateral for an overdue
        // loan
        address collateralContract = _loanTerms.nftCollateralContract;
        uint256 collateralId = _loanTerms.nftCollateralId;
        IEscrow(_loanTerms.escrow).unlockCollateral(
            _loanTerms.nftCollateralWrapper,
            collateralContract,
            collateralId,
            _lender
        );
    }

    function _checkDelegationAndUndelegate(uint32 _loanId) internal {
        IDelegateCashPlugin delegateCashPlugin = IDelegateCashPlugin(hub.getContract(ContractKeys.DELEGATE_PLUGIN));
        if (delegateCashPlugin.isCollateralDelegated(_loanId)) {
            delegateCashPlugin.undelegateERC721(_loanId);
        }
    }

    /**
     * @notice Resolving the loan without transferring the nft to provide a base for the bundle
     * break up of the bundled loans
     *
     * @param _loanId  A unique identifier for this particular loan, sourced from the Loan Coordinator.
     * @param _loanCoordinator - The loan coordinator used when creating the loan.
     */
    function _resolveLoanState(uint32 _loanId, ILoanCoordinator _loanCoordinator, bool _repaid) internal {
        // Mark loan as liquidated before doing any external transfers to follow the Checks-Effects-Interactions design
        // pattern
        loanRepaidOrLiquidated[_loanId] = true;

        // Destroy the lender's promissory note for this loan and borrower obligation receipt
        _loanCoordinator.resolveLoan(_loanId, _repaid);
    }

    /**
     * @notice This function can be called by admins to change the permitted status of an ERC20 currency. This includes
     * both adding an ERC20 currency to the permitted list and removing it.
     *
     * @param _erc20 - The address of the ERC20 currency whose permit list status changed.
     * @param _permit - The new status of whether the currency is permitted or not.
     */
    function _setERC20Permit(address _erc20, bool _permit) internal {
        if (_erc20 == address(0)) {
            revert ERC20ZeroAddress();
        }
        erc20Permits[_erc20] = _permit;

        emit ERC20Permit(_erc20, _permit);
    }

    /**
     * @dev Performs some validation checks over loan parameters
     *
     */
    function _loanSanityChecks(LoanData.Offer memory _offer, address _nftWrapper) internal view {
        if (!getERC20Permit(_offer.loanERC20Denomination)) {
            revert CurrencyDenominationNotPermitted();
        }
        if (_nftWrapper == address(0)) {
            revert NFTCollateralContractNotPermitted();
        }
        if (uint256(_offer.loanDuration) > maximumLoanDuration) {
            revert LoanDurationExceedsMaximum();
        }
        if (uint256(_offer.loanDuration) == 0) {
            revert LoanDurationCannotBeZero();
        }
        if (_offer.loanPrincipalAmount == 0) {
            revert ZeroPrincipal();
        }
    }

    /**
     * @dev reads some variable values of a loan for payback functions, created to reduce code repetition
     */
    function _getPartiesAndData(
        uint32 _loanId
    )
        internal
        view
        returns (address borrower, address lender, LoanTerms memory loan, ILoanCoordinator loanCoordinator)
    {
        loanCoordinator = ILoanCoordinator(hub.getContract(LOAN_COORDINATOR));
        ILoanCoordinator.Loan memory loanCoordinatorData = loanCoordinator.getLoanData(_loanId);
        uint256 smartNftId = loanCoordinatorData.smartNftId;
        // Fetch loan details from storage, but store them in memory for the sake of saving gas.
        loan = loanIdToLoan[_loanId];
        if (loan.borrower != address(0)) {
            borrower = loan.borrower;
        } else {
            // Fetch current owner of loan obligation note.
            borrower = IERC721(loanCoordinator.obligationReceiptToken()).ownerOf(smartNftId);
        }

        if (loan.lender != address(0)) {
            lender = loan.lender;
        } else {
            // Fetch current owner of loan promissory note.
            lender = IERC721(loanCoordinator.promissoryNoteToken()).ownerOf(smartNftId);
        }
    }

    /**
     * @dev Calculates the payoff amount and admin fee
     */
    function _payoffAndFee(LoanTerms memory _loanTerms) internal view virtual returns (uint256, uint256);

    /**
     * @dev Checks that the collateral is a supported contracts and returns what wrapper to use for the loan's NFT
     * collateral contract.
     *
     * @param _nftCollateralContract - The address of the the NFT collateral contract.
     *
     * @return Address of the NftWrapper to use for the loan's NFT collateral.
     */
    function _getWrapper(address _nftCollateralContract) internal view returns (address) {
        return IPermittedNFTs(hub.getContract(ContractKeys.PERMITTED_NFTS)).getNFTWrapper(_nftCollateralContract);
    }

    function _getOwnOfferType() internal view returns (bytes32) {
        return ILoanCoordinator(hub.getContract(LOAN_COORDINATOR)).getTypeOfLoanContract(address(this));
    }

    function getERC20TransferManagerAddress() public view returns (address) {
        return hub.getContract(ContractKeys.ERC20_TRANSFER_MANAGER);
    }
}
