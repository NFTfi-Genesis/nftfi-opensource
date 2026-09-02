// SPDX-License-Identifier: GPL-3.0

import {INftfiHub} from "../interfaces/INftfiHub.sol";

pragma solidity 0.8.19;

abstract contract LegacyLoan {
    struct LoanTerms {
        uint256 loanPrincipalAmount;
        uint256 maximumRepaymentAmount;
        uint256 nftCollateralId;
        address loanERC20Denomination;
        uint32 loanDuration;
        uint16 loanInterestRateForDurationInBasisPoints;
        uint16 loanAdminFeeInBasisPoints;
        address nftCollateralWrapper;
        uint64 loanStartTime;
        address nftCollateralContract;
        address borrower;
    }

    struct LoanExtras {
        address revenueSharePartner;
        uint16 revenueShareInBasisPoints;
        uint16 referralFeeInBasisPoints;
    }

    event LoanStarted(
        uint32 indexed loanId,
        address indexed borrower,
        address indexed lender,
        LoanTerms loanTerms,
        LoanExtras loanExtras
    );

    struct Offer {
        uint256 loanPrincipalAmount;
        uint256 maximumRepaymentAmount;
        uint256 nftCollateralId;
        address nftCollateralContract;
        uint32 loanDuration;
        uint16 loanAdminFeeInBasisPoints;
        address loanERC20Denomination;
        address referrer;
    }

    struct Signature {
        uint256 nonce;
        uint256 expiry;
        address signer;
        bytes signature;
    }

    struct BorrowerSettings {
        address revenueSharePartner;
        uint16 referralFeeInBasisPoints;
    }

    struct CollectionIdRange {
        uint256 minId;
        uint256 maxId;
    }

    address public owner;
    INftfiHub public hub;

    // solhint-disable-next-line immutable-vars-naming
    bytes32 public LOAN_COORDINATOR;

    function pause() external virtual;
    function unpause() external virtual;

    function mintObligationReceipt(uint32 _loanId) external virtual;

    function acceptOffer(
        Offer memory _offer,
        Signature memory _signature,
        BorrowerSettings memory _borrowerSettings
    ) external virtual;

    function acceptCollectionOffer(
        Offer memory _offer,
        Signature memory _signature,
        BorrowerSettings memory _borrowerSettings
    ) external virtual;

    function acceptCollectionOfferWithIdRange(
        Offer memory _offer,
        CollectionIdRange memory _idRange,
        Signature memory _signature,
        BorrowerSettings memory _borrowerSettings
    ) external virtual;
}
