// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import {Escrow} from "./Escrow.sol";
import {IPersonalEscrow} from "../interfaces/IPersonalEscrow.sol";
import {IEscrow} from "../interfaces/IEscrow.sol";
import {INftWrapper} from "../interfaces/INftWrapper.sol";

import {Initializable} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import {Address} from "@openzeppelin/contracts/utils/Address.sol";

/**
 * @title  PersonalEscrow
 * @author NFTfi
 * @notice User-specific escrow contract
 **/
contract PersonalEscrow is IPersonalEscrow, Escrow, Initializable {
    event Initialized(address owner);

    /**
     * @dev Initializes the Escrow contract with a null owner.
     * @param _hub Address of the NftfiHub contract
     */
    constructor(address _hub) Escrow(address(0), _hub) {}

    /**
     * @notice Initializes the contract setting the owner.
     * @param _owner Address of the new owner of the excrow
     */
    function initialize(address _owner) external initializer {
        _setOwner(_owner);
        emit Initialized(_owner);
    }

    /**
     * @notice Locks the NFT collateral in the escrow.
     * @param _nftCollateralWrapper Address of the NFT collateral wrapper
     * @param _nftCollateralContract Address of the NFT collateral contract
     * @param _nftCollateralId ID of the NFT collateral
     * @param _borrower Address of the borrower
     */
    function lockCollateral(
        address _nftCollateralWrapper,
        address _nftCollateralContract,
        uint256 _nftCollateralId,
        address _borrower
    ) external override(IEscrow, Escrow) onlyLoan {
        // we need to check that the escrow owns more collateral tokens that the ones already locked
        // - in case of balance 0 check is FALSE: we have to attempt to transfer the token
        // - in case of non fungibles if balance is 1 and escrowed is 0, check is TRUE we have the unlocked token: OK
        // - in case of non fungibles if balance is 1 and escrowed is 1,
        //   we have the token already locked, check is FALSE - transfer will be attempted and fail
        //   (because it's unique ans is already here)
        // - in case of fungibles (1155) if balance is n + k (k>1 positive integer) and escrowed is n,
        //   check is TRUE, we have unlocked token(s): OK
        // - in case of fungibles (1155) if balance is n and escrowed is n (equal),
        //   we only have locked token(s), check is FALSE: we have to attempt to transfer the token
        if (
            _balanceOf(_nftCollateralWrapper, _nftCollateralContract, _nftCollateralId) >
            _escrowTokens[_nftCollateralContract][_nftCollateralId]
        ) {
            // we only lock, collateral is already in contract, no need to transfer
            _lockCollateral(_nftCollateralContract, _nftCollateralId);
        } else {
            // we lock and transfer
            _lockCollateral(_nftCollateralContract, _nftCollateralId);
            _transferNFT(_nftCollateralWrapper, _nftCollateralContract, _nftCollateralId, _borrower, address(this));
        }
    }

    /**
     * @dev Checks balance of a specific NFT owned by the contract.
     *
     * @param _nftCollateralWrapper - Address of the NFT wrapper contract.
     * @param _nftCollateralContract - Address of the NFT collateral contract.
     * @param _nftCollateralId - ID of the NFT collateral.
     * @return bool - True if the contract owns the NFT, false otherwise.
     */
    function _balanceOf(
        address _nftCollateralWrapper,
        address _nftCollateralContract,
        uint256 _nftCollateralId
    ) internal returns (uint256) {
        bytes memory result = Address.functionDelegateCall(
            _nftCollateralWrapper,
            abi.encodeWithSelector(
                INftWrapper(_nftCollateralWrapper).balanceOf.selector,
                address(this),
                _nftCollateralContract,
                _nftCollateralId
            ),
            "Balance check failed"
        );
        return abi.decode(result, (uint256));
    }

    /**
     * @notice Unlocks the NFT collateral from the escrow and transfers it to the recipient.
     * @param _nftCollateralWrapper Address of the NFT collateral wrapper
     * @param _nftCollateralContract Address of the NFT collateral contract
     * @param _nftCollateralId ID of the NFT collateral
     * @param _recipient Address of the recipient
     */
    function unlockCollateral(
        address _nftCollateralWrapper,
        address _nftCollateralContract,
        uint256 _nftCollateralId,
        address _recipient
    ) external override(IEscrow, Escrow) onlyLockingLoan(_nftCollateralContract, _nftCollateralId) {
        _unlockCollateral(_nftCollateralContract, _nftCollateralId);
        _transferNFT(_nftCollateralWrapper, _nftCollateralContract, _nftCollateralId, address(this), _recipient);
    }

    /**
     * @notice unlocks and approves for an escrow contract that is taking over, only locking loan can initiate
     * @param _nftCollateralWrapper Address of the NFT collateral wrapper
     * @param _nftCollateralContract Address of the NFT collateral contract
     * @param _nftCollateralId ID of the NFT collateral
     * @param _recipientEscrow Address of the recipient escrow contract
     */
    function handOverCollateralToEscrow(
        address _nftCollateralWrapper,
        address _nftCollateralContract,
        uint256 _nftCollateralId,
        address _recipientEscrow
    ) external override onlyLockingLoan(_nftCollateralContract, _nftCollateralId) {
        _unlockCollateral(_nftCollateralContract, _nftCollateralId);
        _approveNFT(_nftCollateralWrapper, _recipientEscrow, _nftCollateralContract, _nftCollateralId);
    }

    /**
     * @notice Unlocks the NFT collateral from the escrow without transferring it.
     * @param _nftCollateralContract Address of the NFT collateral contract
     * @param _nftCollateralId ID of the NFT collateral
     */
    function unlockAndKeepCollateral(
        address _nftCollateralContract,
        uint256 _nftCollateralId
    ) external onlyLockingLoan(_nftCollateralContract, _nftCollateralId) {
        _unlockCollateral(_nftCollateralContract, _nftCollateralId);
    }

    /**
     * @dev Approves an NFT to be used by another address trough the NFT adaptor.
     *
     * @param _to - The address to approve to transfer or manage the NFT.
     * @param _nftCollateralContract - The contract address of the NFT.
     * @param _nftCollateralId - The token ID of the NFT.
     *
     * @return bool - Returns true if the approval was successful.
     */
    function _approveNFT(
        address _nftCollateralWrapper,
        address _to,
        address _nftCollateralContract,
        uint256 _nftCollateralId
    ) internal returns (bool) {
        bytes memory result = Address.functionDelegateCall(
            _nftCollateralWrapper,
            abi.encodeWithSelector(
                INftWrapper(_nftCollateralWrapper).approveNFT.selector,
                _to,
                _nftCollateralContract,
                _nftCollateralId
            ),
            "NFT not successfully approved"
        );

        return abi.decode(result, (bool));
    }

    function addPlugin(address) external pure override(Escrow) {
        revert AddingOrRemovingPluginsNotAllowed();
    }

    function removePlugin(address) external pure override(Escrow) {
        revert AddingOrRemovingPluginsNotAllowed();
    }
}
