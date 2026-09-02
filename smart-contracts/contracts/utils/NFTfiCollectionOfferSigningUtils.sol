// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

import {LoanData} from "../loans/loanTypes/LoanData.sol";
import {SignatureChecker, ECDSA} from "@openzeppelin/contracts/utils/cryptography/SignatureChecker.sol";

/**
 * @title  NFTfiCollectionOfferSigningUtils
 * @author NFTfi
 * @notice Helper contract for NFTfi. This contract manages verifying signatures from off-chain NFTfi orders.
 * Based on the version of this same contract used on NFTfi V1
 */
library NFTfiCollectionOfferSigningUtils {
    /* ********* */
    /* FUNCTIONS */
    /* ********* */

    /**
     * @dev This function gets the current chain ID.
     */
    function getChainID() internal view returns (uint256) {
        uint256 id;
        // solhint-disable-next-line no-inline-assembly
        assembly {
            id := chainid()
        }
        return id;
    }

    /**
     * @notice This function is when the borrower accepts a lender's offer, to validate the lender's signature that the
     * lender provided off-chain to verify that it did indeed made such offer.
     *
     * @param _offer - The offer struct containing:
     * - loanERC20Denomination: The address of the ERC20 contract of the currency being used as principal/interest
     * for this loan.
     * - loanPrincipalAmount: The original sum of money transferred from lender to borrower at the beginning of
     * the loan, measured in loanERC20Denomination's smallest units.
     * - maximumRepaymentAmount: The maximum amount of money that the borrower would be required to retrieve their
     * collateral, measured in the smallest units of the ERC20 currency used for the loan. The borrower will always have
     * to pay this amount to retrieve their collateral, regardless of whether they repay early.
     * - nftCollateralContract: The address of the ERC721 contract of the NFT collateral.
     * - nftCollateralId: The ID within the NFTCollateralContract for the NFT being used as collateral for this
     * loan. The NFT is stored within this contract during the duration of the loan.
     * - loanDuration: The amount of time (measured in seconds) that can elapse before the lender can liquidate the
     * loan and seize the underlying collateral NFT.
     * - loanInterestRateForDurationInBasisPoints: This is the interest rate (measured in basis points, e.g.
     * hundreths of a percent) for the loan, that must be repaid pro-rata by the borrower at the conclusion of the loan
     * or risk seizure of their nft collateral. Note if the type of the loan is fixed then this value  is not used and
     * is irrelevant so it should be set to 0.
     * - isProRata: indicates if a loan is pro-rated or fixed
     * @param _idRange - min and max (inclusive) Id ranges for collection offers on collections,
     * like ArtBlocks, where multiple collections are defined on one contract differentiated by id-ranges
     * @param _signature - The signature structure containing:
     * - signer: The address of the signer. The borrower for `acceptOffer`
     * - nonce: The nonce referred here is not the same as an Ethereum account's nonce.
     * We are referring instead to a nonce that is used by the lender or the borrower when they are first signing
     * off-chain NFTfi orders. These nonce can be any uint256 value that the user has not previously used to sign an
     * off-chain order. Each nonce can be used at most once per user within NFTfi, regardless of whether they are the
     * lender or the borrower in that situation. This serves two purposes:
     *   - First, it prevents replay attacks where an attacker would submit a user's off-chain order more than once.
     *   - Second, it allows a user to cancel an off-chain order by calling
     * NFTfi.cancelLoanCommitment(), which marks the nonce as used and prevents any future loan from
     * using the user's off-chain order that contains that nonce.
     * - expiry: Date when the signature expires
     * - signature: The ECDSA signature of the lender, obtained off-chain ahead of time, signing the following
     * @param _offerType type of the offer registered in the coordinator
     * combination of parameters:
     *   - offer.loanERC20Denomination
     *   - offer.loanPrincipalAmount
     *   - offer.maximumRepaymentAmount
     *   - offer.nftCollateralContract
     *   - offer.nftCollateralId
     *   - offer.loanDuration
     *   - offer.isProRata
     *   - idRange.minId,
     *   - idRange.maxId,
     *   - signature.signer,
     *   - signature.nonce,
     *   - signature.expiry,
     *   - _offerType
     *   - chainId
     */
    function isValidLenderSignatureWithIdRange(
        LoanData.Offer memory _offer,
        LoanData.CollectionIdRange memory _idRange,
        LoanData.Signature memory _signature,
        bytes32 _offerType
    ) internal view returns (bool) {
        // solhint-disable-next-line custom-errors
        require(block.timestamp <= _signature.expiry, "Lender Signature has expired");
        // solhint-disable-next-line custom-errors
        if (_signature.signer == address(0)) {
            return false;
        } else {
            bytes32 message = keccak256(
                abi.encodePacked(
                    getEncodedOffer(_offer),
                    abi.encodePacked(_idRange.minId, _idRange.maxId),
                    getEncodedSignature(_signature),
                    _offerType,
                    getChainID()
                )
            );

            return
                SignatureChecker.isValidSignatureNow(
                    _signature.signer,
                    ECDSA.toEthSignedMessageHash(message),
                    _signature.signature
                );
        }
    }

    /**
     * @dev We need this to avoid stack too deep errors.
     */
    function getEncodedOffer(LoanData.Offer memory _offer) internal pure returns (bytes memory) {
        return
            abi.encodePacked(
                _offer.loanERC20Denomination,
                _offer.loanPrincipalAmount,
                _offer.maximumRepaymentAmount,
                _offer.nftCollateralContract,
                _offer.nftCollateralId,
                _offer.loanDuration,
                _offer.isProRata,
                _offer.originationFee
            );
    }

    /**
     * @dev We need this to avoid stack too deep errors.
     */
    function getEncodedSignature(LoanData.Signature memory _signature) internal pure returns (bytes memory) {
        return abi.encodePacked(_signature.signer, _signature.nonce, _signature.expiry);
    }
}
