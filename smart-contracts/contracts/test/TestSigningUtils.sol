// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

import {LoanData} from "../loans/loanTypes/LoanData.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {NFTfiSigningUtils} from "../utils/NFTfiSigningUtils.sol";

/**
 * @title  TestSigningUtils
 * @author NFTfi
 * @notice Wrapping the NFTfiSigningUtils library in a contract so it can be unit tested
 */
contract TestSigningUtils {
    function getChainID() public view returns (uint256) {
        return NFTfiSigningUtils.getChainID();
    }

    function isValidLenderSignature(
        LoanData.Offer memory _offer,
        LoanData.Signature memory _signature,
        bytes32 _offerType
    ) public view returns (bool) {
        return NFTfiSigningUtils.isValidLenderSignature(_offer, _signature, _offerType);
    }

    function isValidLenderRenegotiationSignature(
        uint32 _loanId,
        uint32 _newLoanDuration,
        bool _isProRata,
        uint256 _newMaximumRepaymentAmount,
        uint256 _renegotiationFee,
        LoanData.Signature memory _signature
    ) public view returns (bool) {
        return
            NFTfiSigningUtils.isValidLenderRenegotiationSignature(
                _loanId,
                _newLoanDuration,
                _isProRata,
                _newMaximumRepaymentAmount,
                _renegotiationFee,
                _signature
            );
    }
}
