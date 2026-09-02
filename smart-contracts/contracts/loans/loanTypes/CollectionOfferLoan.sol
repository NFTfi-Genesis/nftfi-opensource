// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

import {ILoanCoordinator, AssetOfferLoan, NFTfiSigningUtils} from "./AssetOfferLoan.sol";
import {NFTfiCollectionOfferSigningUtils} from "../../utils/NFTfiCollectionOfferSigningUtils.sol";

/**
 * @title CollectionOfferLoan
 * @author NFTfi
 * @notice Main contract for NFTfi Loan Collection Type.
 * This contract manages the ability to create reoccurring NFT-backed
 * peer-to-peer loans of type Fixed (agreed to be a fixed-repayment loan) where the borrower pays the
 * maximumRepaymentAmount regardless of whether they repay early or not.
 * In collection offer type loans the collateral can be any one item (id) of a given NFT collection (contract).
 *
 * To commence an NFT-backed loan:
 *
 * The borrower accepts a lender's offer by calling `acceptOffer`.
 *   1. the borrower calls nftContract.approveAll(NFTfi), approving the NFTfi contract to move their NFT's on their
 * behalf.
 *   2. the lender calls erc20Contract.approve(NFTfi), allowing NFTfi to move the lender's ERC20 tokens on their
 * behalf.
 *   3. the lender signs a reusable off-chain message, proposing its collection offer terms.
 *   4. the borrower calls `acceptOffer` to accept these terms and enter into the loan. The NFT is stored in
 * the contract, the borrower receives the loan principal in the specified ERC20 currency, the lender receives an
 * NFTfi promissory note (in ERC721 form) that represents the rights to either the principal-plus-interest, or the
 * underlying NFT collateral if the borrower does not pay back in time, and the borrower receives obligation receipt
 * (in ERC721 form) that gives them the right to pay back the loan and get the collateral back.
 *  5. another borrower can also repeat step 4 until the original lender cancels or their
 * wallet runs out of funds with allowance to the contract
 *
 * The lender can freely transfer and trade this ERC721 promissory note as they wish, with the knowledge that
 * transferring the ERC721 promissory note transfers the rights to principal-plus-interest and/or collateral, and that
 * they will no longer have a claim on the loan. The ERC721 promissory note itself represents that claim.
 *
 * The borrower can freely transfer and trade this ERC721 obligation receipt as they wish, with the knowledge that
 * transferring the ERC721 obligation receipt transfers the rights right to pay back the loan and get the collateral
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
contract CollectionOfferLoan is AssetOfferLoan {
    /* ************* */
    /* CUSTOM ERRORS */
    /* ************* */

    error CollateralIdNotInRange();
    error MinIdGreaterThanMaxId();
    error OriginalAcceptOfferDisabled();

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
    ) AssetOfferLoan(_admin, _nftfiHub, _permittedErc20s) {
        // solhint-disable-previous-line no-empty-blocks
    }

    /* ******************* */
    /* READ-ONLY FUNCTIONS */
    /* ******************* */

    /**
     * @notice overriding to make it impossible to create a regular offer on this contract (only collection offers)
     */
    function acceptOffer(Offer memory, Signature memory) external override whenNotPaused nonReentrant returns (uint32) {
        revert OriginalAcceptOfferDisabled();
    }

    /**
     * @notice This function is called by the borrower when accepting a lender's collection offer to begin a loan.
     *
     * @param _offer - The offer made by the lender.
     * @param _signature - The components of the lender's signature.
     * stolen or otherwise unwanted items
     */
    function acceptCollectionOffer(
        Offer memory _offer,
        Signature memory _signature
    ) external whenNotPaused nonReentrant returns (uint32) {
        address nftWrapper = _getWrapper(_offer.nftCollateralContract);
        _loanSanityChecks(_offer, nftWrapper);
        _loanSanityChecksOffer(_offer);
        return _acceptOffer(_setupLoanTerms(_offer, _signature.signer, nftWrapper), _offer, _signature);
    }

    /**
     * @notice This function is called by the borrower when accepting a lender's
     * collection offer with a given id range to begin a loan
     *
     * @param _offer - The offer made by the lender.
     * @param _idRange - min and max (inclusive) Id ranges for collection offers on collections,
     * like ArtBlocks, where multiple collections are defined on one contract differentiated by id-ranges
     * @param _signature - The components of the lender's signature.
     * stolen or otherwise unwanted items
     */
    function acceptCollectionOfferWithIdRange(
        Offer memory _offer,
        CollectionIdRange memory _idRange,
        Signature memory _signature
    ) external whenNotPaused nonReentrant returns (uint32) {
        address nftWrapper = _getWrapper(_offer.nftCollateralContract);
        _loanSanityChecks(_offer, nftWrapper);
        _loanSanityChecksOffer(_offer);
        _idRangeSanityCheck(_idRange);
        return
            _acceptOfferWithIdRange(
                _setupLoanTerms(_offer, _signature.signer, nftWrapper),
                _offer,
                _idRange,
                _signature
            );
    }

    /* ****************** */
    /* INTERNAL FUNCTIONS */
    /* ****************** */

    /**
     * @notice This function is called by the borrower when accepting a lender's offer
     * to begin a loan with the public function acceptCollectionOffer.
     *
     * @param _loanTerms - The main Loan Terms struct. This data is saved upon loan creation on loanIdToLoan.
     * @param _offer - The offer made by the lender.
     * @param _signature - The components of the lender's signature.
     * stolen or otherwise unwanted items
     */
    function _acceptOffer(
        LoanTerms memory _loanTerms,
        Offer memory _offer,
        Signature memory _signature
    ) internal override returns (uint32) {
        // still checking the nonce for possible cancellations
        ILoanCoordinator(hub.getContract(LOAN_COORDINATOR)).checkNonce(_signature.signer, _signature.nonce);
        // Note that we are not invalidating the nonce as part of acceptOffer (as is the case for loan types in general)
        // since the nonce that the lender signed with remains valid for all loans for the collection offer

        Offer memory offerToCheck = _offer;

        offerToCheck.nftCollateralId = 0;

        bytes32 offerType = _getOwnOfferType();

        if (!NFTfiSigningUtils.isValidLenderSignature(offerToCheck, _signature, offerType)) {
            revert InvalidLenderSignature();
        }

        uint32 loanId = _createLoan(_loanTerms, msg.sender);

        // Emit an event with all relevant details from this transaction.
        emit LoanStarted(loanId, msg.sender, _signature.signer, _loanTerms);

        return loanId;
    }

    /**
     * @notice This function is called by the borrower when accepting a lender's
     * collection offer with a given id range to begin a loan
     *
     * @param _loanTerms - The main Loan Terms struct. This data is saved upon loan creation on loanIdToLoan.
     * @param _idRange - min and max (inclusive) Id ranges for collection offers on collections,
     * like ArtBlocks, where multiple collections are defined on one contract differentiated by id-ranges
     * @param _offer - The offer made by the lender.
     * @param _signature - The components of the lender's signature.
     * stolen or otherwise unwanted items
     */
    function _acceptOfferWithIdRange(
        LoanTerms memory _loanTerms,
        Offer memory _offer,
        CollectionIdRange memory _idRange,
        Signature memory _signature
    ) internal returns (uint32) {
        // still checking the nonce for possible cancellations
        ILoanCoordinator(hub.getContract(LOAN_COORDINATOR)).checkNonce(_signature.signer, _signature.nonce);
        // Note that we are not invalidating the nonce as part of acceptOffer (as is the case for loan types in general)
        // since the nonce that the lender signed with remains valid for all loans for the collection offer

        //check for id range
        if (_loanTerms.nftCollateralId < _idRange.minId || _loanTerms.nftCollateralId > _idRange.maxId) {
            revert CollateralIdNotInRange();
        }
        Offer memory offerToCheck = _offer;

        offerToCheck.nftCollateralId = 0;

        bytes32 offerType = _getOwnOfferType();

        if (
            !NFTfiCollectionOfferSigningUtils.isValidLenderSignatureWithIdRange(
                offerToCheck,
                _idRange,
                _signature,
                offerType
            )
        ) {
            revert InvalidLenderSignature();
        }

        uint32 loanId = _createLoan(_loanTerms, msg.sender);

        // Emit an event with all relevant details from this transaction.
        emit LoanStarted(loanId, msg.sender, _signature.signer, _loanTerms);

        return loanId;
    }

    function _idRangeSanityCheck(CollectionIdRange memory _idRange) internal pure {
        if (_idRange.minId > _idRange.maxId) {
            revert MinIdGreaterThanMaxId();
        }
    }
}
