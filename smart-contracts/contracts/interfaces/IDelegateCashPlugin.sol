// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

interface IDelegateCashPlugin {
    struct DelegationSettings {
        address to;
        bytes32 rights;
        bool isERC721;
    }

    function delegateERC721(
        uint32 loanId,
        string memory offerType,
        address to,
        address collateralContract,
        uint256 tokenId,
        bytes32 rights
    ) external;

    function isCollateralDelegated(uint32 _loanId) external view returns (bool);

    function getDelegationSettings(uint32 _loanId) external view returns (DelegationSettings memory);

    function undelegateERC721(uint32 _loanId) external;
}
