// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

import {IEscrow} from "./IEscrow.sol";

interface IPersonalEscrow is IEscrow {
    error AddingOrRemovingPluginsNotAllowed();

    function handOverCollateralToEscrow(
        address _nftCollateralWrapper,
        address _nftCollateralContract,
        uint256 _nftCollateralId,
        address _recipientEscrow
    ) external;
    function unlockAndKeepCollateral(address _nftCollateralContract, uint256 _nftCollateralId) external;
}
