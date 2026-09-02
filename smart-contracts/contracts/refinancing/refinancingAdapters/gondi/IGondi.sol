// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.0;

/// @title Multi Source Loan Interface
/// @author Florida St
/// @notice A multi source loan is one with multiple tranches.
interface IGondi {
    /// @notice Borrowers receive offers that are then validated.
    /// @dev Setting the nftCollateralTokenId to 0 triggers validation through `validators`.
    /// @param offerId Offer ID. Used for canceling/setting as executed.
    /// @param lender Lender of the offer.
    /// @param fee Origination fee.
    /// @param capacity Capacity of the offer.
    /// @param nftCollateralAddress Address of the NFT collateral.
    /// @param nftCollateralTokenId NFT collateral token ID.
    /// @param principalAddress Address of the principal.
    /// @param principalAmount Principal amount of the loan.
    /// @param aprBps APR in BPS.
    /// @param expirationTime Expiration time of the offer.
    /// @param duration Duration of the loan in seconds.
    /// @param maxSeniorRepayment Max amount of senior capital ahead (principal + interest).
    /// @param validators Arbitrary contract to validate offers implementing `IBaseOfferValidator`.
    struct LoanOffer {
        uint256 offerId;
        address lender;
        uint256 fee;
        uint256 capacity;
        address nftCollateralAddress;
        uint256 nftCollateralTokenId;
        address principalAddress;
        uint256 principalAmount;
        uint256 aprBps;
        uint256 expirationTime;
        uint256 duration;
        uint256 maxSeniorRepayment;
        OfferValidator[] validators;
    }

    /// @notice Arbitrary contract to validate offers implementing `IBaseOfferValidator`.
    /// @param validator Address of the validator contract.
    /// @param arguments Arguments to pass to the validator.
    struct OfferValidator {
        address validator;
        bytes arguments;
    }

    /// @notice Offer + how much will be filled (always <= principalAmount).
    /// @param offer Offer.
    /// @param amount Amount to be filled.
    struct OfferExecution {
        LoanOffer offer;
        uint256 amount;
        bytes lenderOfferSignature;
    }

    /// @notice Offer + necessary fields to execute a specific loan. This has a separate expirationTime to avoid
    /// someone holding an offer and executing much later, without the borrower's awareness.
    /// @dev It's advised that borrowers only set an expirationTime close to the actual time they will execute the loan
    ///      to avoid replays.
    /// @param offerExecution List of offers to be filled and amount for each.
    /// @param tokenId NFT collateral token ID.
    /// @param amount The amount the borrower is willing to take (must be <= _loanOffer principalAmount)
    /// @param expirationTime Expiration time of the signed offer by the borrower.
    /// @param callbackData Data to pass to the callback.
    struct ExecutionData {
        OfferExecution[] offerExecution;
        uint256 tokenId;
        uint256 duration;
        uint256 expirationTime;
        address principalReceiver;
        bytes callbackData;
    }

    /// @param executionData Execution data.
    /// @param borrower Address that owns the NFT and will take over the loan.
    /// @param borrowerOfferSignature Signature of the offer (signed by borrower).
    /// @param callbackData Whether to call the afterPrincipalTransfer callback
    struct LoanExecutionData {
        ExecutionData executionData;
        address borrower;
        bytes borrowerOfferSignature;
    }

    /// @param loanId Loan ID.
    /// @param callbackData Whether to call the afterNFTTransfer callback
    /// @param shouldDelegate Whether to delegate ownership of the NFT (avoid seaport flags).
    struct SignableRepaymentData {
        uint256 loanId;
        bytes callbackData;
        bool shouldDelegate;
    }

    /// @param loan Loan.
    /// @param borrowerLoanSignature Signature of the loan (signed by borrower).
    struct LoanRepaymentData {
        SignableRepaymentData data;
        Loan loan;
        bytes borrowerSignature;
    }

    /// @notice Tranches have different seniority levels.
    /// @param loanId Loan ID.
    /// @param floor Amount of principal more senior to this tranche.
    /// @param principalAmount Total principal in this tranche.
    /// @param lender Lender for this given tranche.
    /// @param accruedInterest Accrued Interest.
    /// @param startTime Start Time. Either the time at which the loan initiated / was refinanced.
    /// @param aprBps APR in basis points.
    struct Tranche {
        uint256 loanId;
        uint256 floor;
        uint256 principalAmount;
        address lender;
        uint256 accruedInterest;
        uint256 startTime;
        uint256 aprBps;
    }

    /// @dev Principal Amount is equal to the sum of all tranches principalAmount.
    /// We keep it for caching purposes. Since we are not saving this on chain but the hash,
    /// it does not have a huge impact on gas.
    /// @param borrower Borrower.
    /// @param nftCollateralTokenId NFT Collateral Token ID.
    /// @param nftCollateralAddress NFT Collateral Address.
    /// @param principalAddress Principal Address.
    /// @param principalAmount Principal Amount.
    /// @param startTime Start Time.
    /// @param duration Duration.
    /// @param tranche Tranches.
    /// @param protocolFee Protocol Fee.
    struct Loan {
        address borrower;
        uint256 nftCollateralTokenId;
        address nftCollateralAddress;
        address principalAddress;
        uint256 principalAmount;
        uint256 startTime;
        uint256 duration;
        Tranche[] tranche;
        uint256 protocolFee;
    }

    /// @notice Recipient address and fraction of gains charged by the protocol.
    struct ProtocolFee {
        address recipient;
        uint256 fraction;
    }

    function updateProtocolFee(ProtocolFee calldata _newProtocolFee) external;
    function getProtocolFee() external view returns (ProtocolFee memory);
    function owner() external view returns (address);
    function setProtocolFee() external;

    // solhint-disable-next-line func-name-mixedcase
    function VERSION() external view returns (bytes calldata);
    function name() external view returns (string calldata);

    /// @notice Call by the borrower when emiting a new loan.
    /// @param _loanExecutionData Loan execution data.
    /// @return loanId Loan ID.
    /// @return loan Loan.
    function emitLoan(LoanExecutionData calldata _loanExecutionData) external returns (uint256, Loan memory);

    /// @notice Repay loan. Interest is calculated pro-rata based on time. Lender is defined by nft ownership.
    /// @param _repaymentData Repayment data.
    function repayLoan(LoanRepaymentData calldata _repaymentData) external;

    event LoanEmitted(uint256 loanId, uint256[] offerId, Loan loan, uint256 fee);

    error CancelledOrExecutedOfferError(address _lender, uint256 _offerId);
    error ExpiredOfferError(uint256 _expirationTime);
    error LowOfferIdError(address _lender, uint256 _newMinOfferId, uint256 _minOfferId);
    error LowRenegotiationOfferIdError(address _lender, uint256 _newMinRenegotiationOfferId, uint256 _minOfferId);
    error ZeroInterestError();
    error InvalidSignatureError();
    error CurrencyNotWhitelistedError();
    error CollectionNotWhitelistedError();
    error MaxCapacityExceededError();
    error InvalidLoanError(uint256 _loanId);
    error NotStrictlyImprovedError();
    error InvalidAmountError(uint256 _amount, uint256 _principalAmount);

    error InvalidParametersError();
    error MismatchError();
    error InvalidCollateralIdError();
    error InvalidMethodError();
    error InvalidAddressesError();
    error InvalidCallerError();
    error InvalidTrancheError();
    error InvalidRenegotiationOfferError();
    error TooManyTranchesError();
    error LoanExpiredError();
    error NFTNotReturnedError();
    error TrancheCannotBeRefinancedError(uint256 minTimestamp);
    error LoanLockedError();

    error AddressAlreadyAddedError(address _address);
    error AddressNotAddedError(address _address);

    /**
     * @dev The signature derives the `address(0)`.
     */
    error ECDSAInvalidSignature();

    /**
     * @dev The signature has an invalid length.
     */
    error ECDSAInvalidSignatureLength(uint256 length);

    /**
     * @dev The signature has an S value that is in the upper half order.
     */
    error ECDSAInvalidSignatureS(bytes32 s);

    error InvalidCallbackError();
    error MulticallFailed();
    error InvalidOwnerError();
    error AddressZeroError();

    error LiquidatorOnlyError(address _liquidator);

    error LoanNotDueError(uint256 _expirationTime);

    error InvalidDurationError();
    error StringsInsufficientHexLength(uint256 value, uint256 length);
}
