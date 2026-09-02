// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import {Ownable} from "../../utils/Ownable.sol";
import {ContractKeys} from "../../utils/ContractKeys.sol";
import {ContractKeyUtils} from "../../utils/ContractKeyUtils.sol";
import {LoanData} from "../../loans/loanTypes/LoanData.sol";
import {LoanCoordinator} from "../../loans/LoanCoordinator.sol";

import {IDelegateRegistry} from "../../interfaces/IDelegateRegistry.sol";
import {ILoanCoordinator} from "../../interfaces/ILoanCoordinator.sol";
import {IDelegateCashPlugin} from "../../interfaces/IDelegateCashPlugin.sol";
import {ILoanBase} from "../../loans/loanTypes/ILoanBase.sol";
import {INftfiHub} from "../../interfaces/INftfiHub.sol";
import {Escrow} from "../Escrow.sol";
import {Pausable} from "@openzeppelin/contracts/security/Pausable.sol";

contract DelegateCashPlugin is IDelegateCashPlugin, Ownable, Pausable {
    // solhint-disable-next-line immutable-vars-naming
    INftfiHub public immutable hub;
    // solhint-disable-next-line immutable-vars-naming
    address public delegateCashAddress;
    address public thisContract;

    /**
     * @dev keeps track of delegation settings to withdraw it later when unlocking
     * loan id => settings
     */
    mapping(uint32 => DelegationSettings) private delegationSettings;

    error WrongOfferLoan();
    error CallerIsNotBorrower();
    error ObligationReceiptExists();
    error OnlyEscrow();
    error OnlyLoanContract();
    error ExternalCallError();
    error LoanAlreadyRepaidOrLiquidated();

    constructor(address _delegateCashAddress, INftfiHub _hub, address _admin) Ownable(_admin) {
        delegateCashAddress = _delegateCashAddress;
        hub = _hub;
        thisContract = address(this);
        _pause();
    }

    /**
     * @dev Triggers stopped state.
     *
     * Requirements:
     *
     * - Only the owner can call this method.
     * - The contract must not be paused.
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Returns to normal state.
     *
     * Requirements:
     *
     * - Only the owner can call this method.
     * - The contract must be paused.
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @notice Function allowing usage of delegate cash delegation for ERC721 assets in escrow by the borrower
     * @param _loanId -
     * @param _offerType -
     * @param _to -
     * @param _collateralContract -
     * @param _tokenId -
     * @param _rights -
     */
    function delegateERC721(
        uint32 _loanId,
        string memory _offerType,
        address _to,
        address _collateralContract,
        uint256 _tokenId,
        bytes32 _rights
    ) external override whenNotPaused {
        _delegationChecks(_loanId, _offerType);
        bytes memory data = abi.encodeWithSelector(
            IDelegateRegistry.delegateERC721.selector,
            _to,
            _collateralContract,
            _tokenId,
            _rights,
            true
        );
        (bool success, ) = Escrow(hub.getContract(ContractKeys.ESCROW)).pluginCall(delegateCashAddress, data);
        if (!success) revert ExternalCallError();
        delegationSettings[_loanId] = DelegationSettings(_to, _rights, true);
    }

    /**
     * @notice Function allowing usage of delegate cash undelegation for ERC721 assets in escrow by the loan contract
     * @param _loanId -
     */
    function undelegateERC721(uint32 _loanId) external override {
        ILoanCoordinator.Loan memory loan = ILoanCoordinator(hub.getContract(ContractKeys.LOAN_COORDINATOR))
            .getLoanData(_loanId);
        LoanData.LoanTerms memory loanTerms = ILoanBase(loan.loanContract).getLoanTerms(_loanId);

        DelegationSettings memory settings = delegationSettings[_loanId];
        if (loan.loanContract != msg.sender) revert OnlyLoanContract();

        bytes memory data = abi.encodeWithSelector(
            IDelegateRegistry.delegateERC721.selector,
            settings.to,
            loanTerms.nftCollateralContract,
            loanTerms.nftCollateralId,
            settings.rights,
            false
        );
        (bool success, ) = Escrow(hub.getContract(ContractKeys.ESCROW)).pluginCall(delegateCashAddress, data);
        if (!success) revert ExternalCallError();
        delete delegationSettings[_loanId];
    }

    function isCollateralDelegated(uint32 _loanId) external view returns (bool) {
        return delegationSettings[_loanId].to != address(0);
    }

    function getDelegationSettings(uint32 _loanId) external view returns (DelegationSettings memory) {
        return delegationSettings[_loanId];
    }

    function _delegationChecks(uint32 _loanId, string memory _offerType) internal {
        address offerTypeLoan = LoanCoordinator(hub.getContract(ContractKeys.LOAN_COORDINATOR))
            .getDefaultLoanContractForOfferType(ContractKeyUtils.getIdFromStringKey(_offerType));

        if (address(0) == offerTypeLoan) {
            revert WrongOfferLoan();
        }

        LoanData.LoanTerms memory loanTerms = ILoanBase(offerTypeLoan).getLoanTerms(_loanId);
        DelegationSettings memory settings = delegationSettings[_loanId];

        // call off the previous delegation if it exists
        if (settings.to != address(0)) {
            bytes memory data = abi.encodeWithSelector(
                IDelegateRegistry.delegateERC721.selector,
                settings.to,
                loanTerms.nftCollateralContract,
                loanTerms.nftCollateralId,
                settings.rights,
                false
            );

            (bool success, ) = Escrow(hub.getContract(ContractKeys.ESCROW)).pluginCall(delegateCashAddress, data);
            if (!success) revert ExternalCallError();
        }

        bool repaidOrLiquidated = ILoanBase(offerTypeLoan).loanRepaidOrLiquidated(_loanId);

        if (repaidOrLiquidated) {
            revert LoanAlreadyRepaidOrLiquidated();
        }

        if (loanTerms.borrower == address(0)) {
            revert ObligationReceiptExists();
        }

        if (loanTerms.borrower != msg.sender) {
            revert CallerIsNotBorrower();
        }
    }

    function _checkIfEscrow() internal view {
        if (msg.sender != hub.getContract(ContractKeys.ESCROW)) revert OnlyEscrow();
    }
}
