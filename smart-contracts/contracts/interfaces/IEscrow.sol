// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

interface IEscrow {
    function lockCollateral(
        address _nftCollateralWrapper,
        address _nftCollateralContract,
        uint256 _nftCollateralId,
        address _borrower
    ) external;

    function unlockCollateral(
        address _nftCollateralWrapper,
        address _nftCollateralContract,
        uint256 _nftCollateralId,
        address _recipient
    ) external;

    function handOverLoan(address _newLoanContract, address _nftCollateralContract, uint256 _nftCollateralId) external;

    function isInEscrowWithLoan(
        address _nftCollateralContract,
        uint256 _nftCollateralId,
        address _loan
    ) external view returns (bool);
}
