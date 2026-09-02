// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

import {IRefinancingAdapter} from "./IRefinancingAdapter.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {IBlend} from "./blend/IBlend.sol";
import {IBlurPool} from "./blend/IBlurPool.sol";
import {IWETH9} from "./blend/IWETH9.sol";
import {BlendHelpers} from "./blend/BlendHelpers.sol";
import {Lien} from "./blend/BlendStructs.sol";

/**
 * @title BlendRefinancingAdapter
 * @author NFTfi
 * @dev This contract is an implementation of the IRefinancingAdapter for the Blend platform.
 * It handles operations related to refinancing Blend loans such as transferring the borrower role,
 * paying off loans, and retrieving loan and collateral details.
 */
contract BlendRefinancingAdapter is IRefinancingAdapter {
    error transferBorrowerRoleFailed();

    /**
     * @dev Gets the address of the borrower for a specific Blend loan.
     * @param _extraData The ABI-encoded Lien struct containing loan details from Blend.
     * This data must be retrieved from events as Blend does not provide a direct query method.
     * @return address of the borrower from the encoded Lien struct.
     */
    function getBorrowerAddress(address, uint256, bytes calldata _extraData) external pure override returns (address) {
        return _decodeExtraData(_extraData).borrower;
    }

    /**
     * @dev Handles the borrower role transfer for Blend loans.
     * @notice For Blend, no borrower role transfer is possible, unused function
     * @return Always returns true as no additional action is required.
     */
    function transferBorrowerRole(address, uint256, bytes calldata) external pure override returns (bool) {
        return true;
    }

    /**
     * @dev Pays off a Blend loan as part of the refinancing process.
     * @param _loanContract The address of the Blend contract.
     * @param _loanIdentifier The lien ID of the Blend loan.
     * @param _payBackAmount The amount of WETH tokens used to pay back the Blend loan.
     * @param _extraData The ABI-encoded Lien struct containing the loan details needed for repayment.
     * @return A boolean value indicating whether the operation was successful.
     * @notice This function unwraps WETH to ETH, deposits it to the Blur pool, and calls
     * Blend's repay function with the lien details.
     */
    function payOffRefinancable(
        address _loanContract,
        uint256 _loanIdentifier,
        address,
        uint256 _payBackAmount,
        bytes calldata _extraData
    ) external override returns (bool) {
        // Approve WETH contract to spend tokens
        IERC20(BlendHelpers._WETH).approve(BlendHelpers._WETH, _payBackAmount);

        // Withdraw eth from WETH contract
        IWETH9(BlendHelpers._WETH).withdraw(_payBackAmount);

        // deposit to blur pool with eth amount value
        IBlurPool(BlendHelpers._BLUR_POOL).deposit{value: _payBackAmount}();

        //call repay on blend
        Lien memory lien = _decodeExtraData(_extraData);
        IBlend(_loanContract).repay(lien, _loanIdentifier);

        return true;
    }

    /**
     * @dev Gets the NFT collateral information for a specific Blend loan.
     * @param _extraData The ABI-encoded Lien struct containing loan details from Blend.
     * @return nftCollateralContract The address of the NFT collection contract.
     * @return nftCollateralId The token ID of the NFT used as collateral.
     */
    function getCollateral(
        address,
        uint256,
        bytes calldata _extraData
    ) external pure override returns (address, uint256) {
        Lien memory lien = _decodeExtraData(_extraData);
        return (address(lien.collection), lien.tokenId);
    }

    /**
     * @dev Gets the payoff details for a specific Blend loan.
     * @param _extraData The ABI-encoded Lien struct containing loan details from Blend.
     * @return loanERC20Denomination The address of the payoff token (always WETH for Blend).
     * @return maximumRepaymentAmount The total amount required to pay off the loan, calculated based
     * on the principal, interest rate, and time elapsed since loan creation.
     * @notice This function calculates the current debt including accrued interest at the moment of calling.
     * We are using the exact logic from Blend's computeCurrentDebt function
     */
    function getPayoffDetails(
        address,
        uint256,
        bytes calldata _extraData
    ) external view override returns (address, uint256) {
        Lien memory lien = _decodeExtraData(_extraData);
        uint256 payOffAmount = BlendHelpers.computeCurrentDebt(lien.amount, lien.rate, lien.startTime);

        return (BlendHelpers._WETH, payOffAmount);
    }

    /**
     * @dev Helper function to decode the Lien struct from the encoded extraData.
     * @param _extraData The ABI-encoded Lien struct.
     * @return The decoded Lien struct containing all loan details.
     */
    function _decodeExtraData(bytes calldata _extraData) internal pure returns (Lien memory) {
        return abi.decode(_extraData, (Lien));
    }
}
