// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

//solhint-disable-next-line contract-name-camelcase
interface IGondi3_1 {
    struct OfferValidator {
        address validator;
        bytes arguments;
    }

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

    struct OfferExecution {
        LoanOffer offer;
        uint256 amount;
        bytes lenderOfferSignature;
    }

    struct ExecutionData {
        OfferExecution[] offerExecution;
        uint256 loanId; // new in 3.1
        address nftCollateralAddress; // new in 3.1
        uint256 tokenId;
        uint256 duration;
        uint256 expirationTime;
        address principalReceiver;
        bytes callbackData;
    }

    struct LoanExecutionData {
        ExecutionData executionData;
        address borrower;
        bytes borrowerOfferSignature;
    }

    struct Tranche {
        uint256 loanId;
        uint256 floor;
        uint256 principalAmount;
        address lender;
        uint256 accruedInterest;
        uint256 startTime;
        uint256 aprBps;
    }

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

    // --- Core 3.1 entrypoint ---
    function emitLoan(LoanExecutionData calldata _loanExecutionData) external;

    /// @notice Recipient address and fraction of gains charged by the protocol.
    struct ProtocolFee {
        address recipient;
        uint256 fraction;
    }

    function updateProtocolFee(ProtocolFee calldata _newProtocolFee) external;
    function getProtocolFee() external view returns (ProtocolFee memory);

    // --- Metadata ---
    function name() external view returns (string memory);
    // solhint-disable-next-line func-name-mixedcase
    function VERSION() external view returns (bytes memory);

    function owner() external view returns (address);

    // --- Events (same as 3.0, include LoanEmitted etc.) ---
    event LoanEmitted(uint256 loanId, uint256[] offerId, Loan loan, uint256 fee);

    error InvalidSignatureError();
}
