// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import {Ownable} from "../utils/Ownable.sol";
import {INftWrapper} from "../interfaces/INftWrapper.sol";
import {IEscrow} from "../interfaces/IEscrow.sol";
import {NftReceiver} from "../utils/NftReceiver.sol";
import {INftfiHub} from "../interfaces/INftfiHub.sol";
import {ContractKeys} from "../utils/ContractKeys.sol";
import {LoanCoordinator} from "../loans/LoanCoordinator.sol";
import {IPermittedNFTs} from "../interfaces/IPermittedNFTs.sol";

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Address} from "@openzeppelin/contracts/utils/Address.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title  Escrow
 * @author NFTfi
 * @notice Protocol wide escrow contract for NFT collateral
 * used when a user doen't have a personal escrow deployed
 **/
contract Escrow is IEscrow, Ownable, NftReceiver {
    using SafeERC20 for IERC20;

    // collateral contract => collateral id => locker contract(loan) => amount (preparing for 1155)
    mapping(address => mapping(uint256 => mapping(address => uint256))) internal _tokensLockedByLoan;

    /**
     * @dev keeps track of tokens being held as loan collateral, so we dont allow these
     * to be transferred with the aridrop draining functions
     * nft contract address => nft id => amount (in case of 1155)
     */
    mapping(address => mapping(uint256 => uint256)) internal _escrowTokens;

    // addresses of contracts thathas plugin rights
    mapping(address => bool) private plugins;

    // solhint-disable-next-line immutable-vars-naming
    INftfiHub public immutable hub;

    event Locked(
        address indexed nftCollateralContract,
        uint256 indexed nftCollateralId,
        address indexed borrower,
        address loanContract
    );

    event Unlocked(
        address indexed nftCollateralContract,
        uint256 indexed nftCollateralId,
        address indexed recipient,
        address loanContract
    );

    event LoanHandedOver(
        address indexed nftCollateralContract,
        uint256 indexed nftCollateralId,
        address oldLoanContract,
        address newloanContract
    );

    error OnlyLoanContract();
    error CollateralNotLockedByLoan();
    error NoSuchTokenOwned();
    error NoSuchERC1155sOwned();
    error NoSuchERC721Owned();
    error NoSuchERC20Owned();
    error TokenIsCollateral();
    error CollateralDelegated();
    error NotAPlugin();

    /**
     * @notice Sets the admin of the contract.
     *
     * @param _admin - Initial admin of this contract.
     */
    constructor(address _admin, address _hub) Ownable(_admin) {
        hub = INftfiHub(_hub);
    }

    /**
     * @notice Checks if the caller is is a loan contract
     */
    modifier onlyLoan() {
        // checking that locker is a registered loan type
        // WARNING if we ever register an external account (or malicious contract) as a loan type that
        // account can steal user nfts that has been approved for this contract by locking and unlocking
        if (
            LoanCoordinator(hub.getContract(ContractKeys.LOAN_COORDINATOR)).getTypeOfLoanContract(msg.sender) ==
            bytes32(0)
        ) revert OnlyLoanContract();
        _;
    }

    /**
     * @notice Checks if the caller is the locker of the given collateral nft in the parameter
     *
     * @param _nftCollateralContract - Address of the NFT collateral contract.
     * @param _nftCollateralId - ID of the NFT collateral.
     */
    modifier onlyLockingLoan(address _nftCollateralContract, uint256 _nftCollateralId) {
        if (_tokensLockedByLoan[_nftCollateralContract][_nftCollateralId][msg.sender] == 0)
            revert CollateralNotLockedByLoan();
        _;
    }

    /**
     * @notice Locks collateral NFT for a loan.
     *
     * @param _nftCollateralWrapper - Address of the NFT wrapper contract.
     * @param _nftCollateralContract - Address of the NFT collateral contract.
     * @param _nftCollateralId - ID of the NFT collateral.
     * @param _borrower - Address of the borrower.
     */
    function lockCollateral(
        address _nftCollateralWrapper,
        address _nftCollateralContract,
        uint256 _nftCollateralId,
        address _borrower
    ) external virtual override onlyLoan {
        _lockCollateral(_nftCollateralContract, _nftCollateralId);
        _transferNFT(_nftCollateralWrapper, _nftCollateralContract, _nftCollateralId, _borrower, address(this));
        emit Locked(_nftCollateralContract, _nftCollateralId, _borrower, msg.sender);
    }

    /**
     * @notice Internal function to lock collateral.
     *
     * @param _nftCollateralContract - Address of the NFT collateral contract.
     * @param _nftCollateralId - ID of the NFT collateral.
     */
    function _lockCollateral(address _nftCollateralContract, uint256 _nftCollateralId) internal {
        _tokensLockedByLoan[_nftCollateralContract][_nftCollateralId][msg.sender] += 1;
        _escrowTokens[_nftCollateralContract][_nftCollateralId] += 1;
    }

    /**
     * @notice Unlocks collateral NFT for a loan.
     *
     * @param _nftCollateralWrapper - Address of the NFT wrapper contract.
     * @param _nftCollateralContract - Address of the NFT collateral contract.
     * @param _nftCollateralId - ID of the NFT collateral.
     * @param _recipient - Address of the recipient.
     */
    function unlockCollateral(
        address _nftCollateralWrapper,
        address _nftCollateralContract,
        uint256 _nftCollateralId,
        address _recipient
    ) external virtual override onlyLockingLoan(_nftCollateralContract, _nftCollateralId) {
        _unlockCollateral(_nftCollateralContract, _nftCollateralId);
        _transferNFT(_nftCollateralWrapper, _nftCollateralContract, _nftCollateralId, address(this), _recipient);
        emit Unlocked(_nftCollateralContract, _nftCollateralId, _recipient, msg.sender);
    }

    /**
     * @notice Internal function to unlock collateral.
     *
     * @param _nftCollateralContract - Address of the NFT collateral contract.
     * @param _nftCollateralId - ID of the NFT collateral.
     */
    function _unlockCollateral(address _nftCollateralContract, uint256 _nftCollateralId) internal {
        _tokensLockedByLoan[_nftCollateralContract][_nftCollateralId][msg.sender] -= 1;
        _escrowTokens[_nftCollateralContract][_nftCollateralId] -= 1;
    }

    function handOverLoan(
        address _newLoanContract,
        address _nftCollateralContract,
        uint256 _nftCollateralId
    ) external virtual override onlyLockingLoan(_nftCollateralContract, _nftCollateralId) {
        _tokensLockedByLoan[_nftCollateralContract][_nftCollateralId][msg.sender] -= 1;
        _tokensLockedByLoan[_nftCollateralContract][_nftCollateralId][_newLoanContract] += 1;
        emit LoanHandedOver(_nftCollateralContract, _nftCollateralId, msg.sender, _newLoanContract);
    }

    /**
     * @notice Checks if a collateral NFT is in escrow with a specific loan.
     *
      @param _nftCollateralContract - Address of the NFT collateral contract.
     * @param _nftCollateralId - ID of the NFT collateral.
     * @param _loan - Address of the loan contract.
     * @return bool - True if the NFT is in escrow with the loan, false otherwise.
     */
    function isInEscrowWithLoan(
        address _nftCollateralContract,
        uint256 _nftCollateralId,
        address _loan
    ) external view override returns (bool) {
        return _tokensLockedByLoan[_nftCollateralContract][_nftCollateralId][_loan] > 0;
    }

    /**
     * @dev Transfers several types of NFTs using a wrapper that knows how to handle each case.
     *
     * @param _sender - Current owner of the NF
     * @param _recipient - Recipient of the transfer
     */
    function _transferNFT(
        address _nftCollateralWrapper,
        address _nftCollateralContract,
        uint256 _nftCollateralId,
        address _sender,
        address _recipient
    ) internal {
        Address.functionDelegateCall(
            _nftCollateralWrapper,
            abi.encodeWithSelector(
                INftWrapper(_nftCollateralWrapper).transferNFT.selector,
                _sender,
                _recipient,
                _nftCollateralContract,
                _nftCollateralId
            ),
            "NFT not successfully transferred"
        );
    }

    /**
     * @dev Checks if the contract owns a specific NFT.
     *
     * @param _nftCollateralWrapper - Address of the NFT wrapper contract.
     * @param _nftCollateralContract - Address of the NFT collateral contract.
     * @param _nftCollateralId - ID of the NFT collateral.
     * @return bool - True if the contract owns the NFT, false otherwise.
     */
    function _isOwned(
        address _nftCollateralWrapper,
        address _nftCollateralContract,
        uint256 _nftCollateralId
    ) internal returns (bool) {
        bytes memory result = Address.functionDelegateCall(
            _nftCollateralWrapper,
            abi.encodeWithSelector(
                INftWrapper(_nftCollateralWrapper).isOwner.selector,
                address(this),
                _nftCollateralContract,
                _nftCollateralId
            ),
            "Ownership check failed"
        );
        return abi.decode(result, (bool));
    }

    /**
     * @notice used by the owner account to be able to drain sturck ERC20 tokens for revenue share
     * for the locked  collateral NFT-s
     * @param _tokenAddress - address of the token contract for the token to be sent out
     * @param _receiver - receiver of the token
     */
    function drainERC20Airdrop(address _tokenAddress, uint256 amount, address _receiver) external onlyOwner {
        // ensuring that this cannot be used to transfer any permitted, escrowed nft
        // that has the following transfer function (interpreting amount as id):
        // function transfer(address _to, uint256 _tokenId), like CryptoKitties for example
        if (_escrowTokens[_tokenAddress][amount] > 0) {
            revert TokenIsCollateral();
        }

        IERC20 tokenContract = IERC20(_tokenAddress);
        uint256 balance = tokenContract.balanceOf(address(this));
        if (balance == 0) {
            revert NoSuchERC20Owned();
        }
        tokenContract.safeTransfer(_receiver, amount);
    }

    /**
     * @notice used by the owner account to be able to drain any tokens used as collateral that is not locked in a loan
     * @param _tokenAddress - address of the token contract for the token to be sent out
     * @param _tokenId - id token to be sent out
     * @param _receiver - receiver of the token
     */
    function withdrawNFT(address _tokenAddress, uint256 _tokenId, address _receiver) external onlyOwner {
        if (_escrowTokens[_tokenAddress][_tokenId] > 0) {
            revert TokenIsCollateral();
        }
        address tokenWrapper = IPermittedNFTs(hub.getContract(ContractKeys.PERMITTED_NFTS)).getNFTWrapper(
            _tokenAddress
        );
        if (!_isOwned(tokenWrapper, _tokenAddress, _tokenId)) {
            revert NoSuchTokenOwned();
        }
        _transferNFT(tokenWrapper, _tokenAddress, _tokenId, address(this), _receiver);
    }

    /**
     * @notice used by the owner account to be able to drain stuck or airdropped NFTs
     * a check prevents draining collateral
     * @param _nftType - nft type key which is sourced from nftfi hub
     * @param _tokenAddress - address of the token contract for the token to be sent out
     * @param _tokenId - id token to be sent out
     * @param _receiver - receiver of the token
     */
    function drainNFT(
        string memory _nftType,
        address _tokenAddress,
        uint256 _tokenId,
        address _receiver
    ) external onlyOwner {
        if (_escrowTokens[_tokenAddress][_tokenId] > 0) {
            revert TokenIsCollateral();
        }
        bytes32 nftTypeKey = _getIdFromStringKey(_nftType);
        address transferWrapper = IPermittedNFTs(hub.getContract(ContractKeys.PERMITTED_NFTS)).getNftTypeWrapper(
            nftTypeKey
        );
        _transferNFT(transferWrapper, _tokenAddress, _tokenId, address(this), _receiver);
    }

    /**
     * @notice Admin function for adding a plugin that can make an arbitrary function call
     * WARNING! serious security implications! plugins can move the collateral
     * @param _plugin address of the plugin
     */
    function addPlugin(address _plugin) external virtual onlyOwner {
        plugins[_plugin] = true;
    }

    /**
     * @notice Admin function for removing a plugin that can make an arbitrary function call
     * @param _plugin address of the plugin
     */
    function removePlugin(address _plugin) external virtual onlyOwner {
        plugins[_plugin] = false;
    }

    function pluginCall(address _target, bytes memory _data) external returns (bool, bytes memory) {
        if (!plugins[msg.sender]) revert NotAPlugin();
        // solhint-disable-next-line avoid-low-level-calls
        return _target.call(_data);
    }

    /**
     * @notice Returns the bytes32 representation of a string (copied from ContractKeys so we dont need it as a lib)
     * @param _key the string key
     * @return id bytes32 representation
     */
    function _getIdFromStringKey(string memory _key) internal pure returns (bytes32 id) {
        // solhint-disable-next-line custom-errors
        require(bytes(_key).length <= 32, "invalid key");

        // solhint-disable-next-line no-inline-assembly
        assembly {
            id := mload(add(_key, 32))
        }
    }
}
