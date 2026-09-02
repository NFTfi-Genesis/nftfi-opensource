// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

import {SmartNft} from "../smartNft/SmartNft.sol";
import {ILoanCoordinator} from "../interfaces/ILoanCoordinator.sol";
import {INftfiHub} from "../interfaces/INftfiHub.sol";
import {Ownable} from "../utils/Ownable.sol";
import {ContractKeyUtils} from "../utils/ContractKeyUtils.sol";

/**
 * @title  LoanCoordinator
 * @author NFTfi
 * @notice This contract is in charge of coordinating the creation, distribution and desctruction of the SmartNfts
 * related to a loan, the Promossory Note and Obligaiton Receipt.
 */
contract LoanCoordinator is ILoanCoordinator, Ownable {
    /* ******* */
    /* STORAGE */
    /* ******* */

    // solhint-disable-next-line immutable-vars-naming
    INftfiHub public immutable hub;

    /**
     * @dev For each loan type, records the address of the contract that implements the type
     */
    mapping(bytes32 loanType => address offerAddress) private _defaultLoanContractForOfferType;
    /**
     * @dev reverse mapping of offerTypes - for each contract address, records the associated loan type
     */
    mapping(address offerAddress => bytes32 loanType) private _typeOfLoanContract;

    mapping(address => bool) private _isLoanContractDisabled;

    /**
     * @notice A continuously increasing counter that simultaneously allows every loan to have a unique ID and provides
     * a running count of how many loans have been started by this contract.
     */
    uint32 public totalNumLoans = 0;

    uint32 public smartNftIdCounter = 0;

    // The address that deployed this contract
    // solhint-disable-next-line immutable-vars-naming
    address private immutable _deployer;
    bool private _initialized = false;

    mapping(uint32 => Loan) private loans;

    address public override promissoryNoteToken;
    address public override obligationReceiptToken;

    /**
     * @notice A mapping that takes both a user's address and a loan nonce that was first used when signing an off-chain
     * order and checks whether that nonce has previously either been used for a loan, or has been pre-emptively
     * cancelled. The nonce referred to here is not the same as an Ethereum account's nonce. We are referring instead to
     * nonces that are used by both the lender and the borrower when they are first signing off-chain NFTfi orders.
     *
     * These nonces can be any uint256 value that the user has not previously used to sign an off-chain order. Each
     * nonce can be used at most once per user within NFTfi, regardless of whether they are the lender or the borrower
     * in that situation. This serves two purposes. First, it prevents replay attacks where an attacker would submit a
     * user's off-chain order more than once. Second, it allows a user to cancel an off-chain order by calling
     * NFTfi.cancelLoanCommitment(), which marks the nonce as used and prevents any future loan from
     * using the user's off-chain order that contains that nonce.
     */
    mapping(bytes32 offerType => mapping(address user => mapping(uint256 nonce => bool nonceHasBeenUsed)))
        internal _nonceHasBeenUsedForUserByOfferType;

    /* ****** */
    /* EVENTS */
    /* ****** */

    event UpdateStatus(uint32 indexed loanId, address indexed loanContract, StatusType newStatus);

    /**
     * @notice This event is fired whenever the admins register a loan type.
     *
     * @param offerType - offer type represented by keccak256('offer type').
     * @param loanContract - Address of the loan type contract.
     */
    event TypeUpdated(bytes32 indexed offerType, address indexed loanContract);

    /* ************* */
    /* CUSTOM ERRORS */
    /* ************* */

    error NotInitialized();
    error OnlyDeployer();
    error AlreadyInitialized();
    error ObligationReceiptZeroAddress();
    error PromissoryNoteZeroAddress();
    error ObligationReceiptAlreadyExists();
    error PromissoryNoteAlreadyExists();
    error NotRegisteredLoanContract();
    error DisabledLoanContract();
    error PromissoryNoteDoesntExist();
    error LoanStatusMustBeNEW();
    error CallerNotLoanCreatorContract();
    error OfferTypeIsEmpty();
    error LoanContractAlreadyRegistered();
    error FunctionInformationArityMismatch();
    error InvalidNonce();

    /**
     * @dev Function using this modifier can only be executed after this contract is initialized
     *
     */
    modifier onlyInitialized() {
        if (!_initialized) revert NotInitialized();
        _;
    }

    /* *********** */
    /* CONSTRUCTOR */
    /* *********** */

    /**
     * @notice Sets the admin of the contract.
     * Initializes `contractTypes` with a batch of loan types. Sets `NftfiHub`.
     *
     * @param  _nftfiHub - Address of the NftfiHub contract
     * @param _admin - Initial admin of this contract.
     * @param _offerTypes - offer types represented by keccak256('offer type').
     * @param _loanContracts - The addresses of each wrapper contract that implements the loan type's behaviour.
     */
    constructor(
        address _nftfiHub,
        address _admin,
        string[] memory _offerTypes,
        address[] memory _loanContracts
    ) Ownable(_admin) {
        hub = INftfiHub(_nftfiHub);
        _deployer = msg.sender;
        _registerOfferTypes(_offerTypes, _loanContracts);
    }

    /**
     * @dev Sets `promissoryNoteToken` and `obligationReceiptToken`.
     * It can be executed once by the deployer.
     *
     * @param  _promissoryNoteToken - Promissory Note Token address
     * @param  _obligationReceiptToken - Obligaiton Recipt Token address
     */
    function initialize(address _promissoryNoteToken, address _obligationReceiptToken) external {
        if (msg.sender != _deployer) revert OnlyDeployer();
        if (_initialized) revert AlreadyInitialized();
        if (_promissoryNoteToken == address(0)) revert PromissoryNoteZeroAddress();
        if (_obligationReceiptToken == address(0)) revert ObligationReceiptZeroAddress();

        _initialized = true;
        promissoryNoteToken = _promissoryNoteToken;
        obligationReceiptToken = _obligationReceiptToken;
    }

    /**
     * @dev This is called by the OfferType beginning the new loan.
     * It initialize the new loan data, and returns the new loan id.
     */
    function registerLoan() external override onlyInitialized returns (uint32) {
        address loanContract = msg.sender;

        if (_typeOfLoanContract[loanContract] == bytes32(0)) revert NotRegisteredLoanContract();
        if (_isLoanContractDisabled[loanContract]) revert DisabledLoanContract();

        // (loanIds start at 1)
        totalNumLoans += 1;
        Loan memory newLoan = Loan({status: StatusType.NEW, loanContract: loanContract, smartNftId: 0});

        loans[totalNumLoans] = newLoan;
        emit UpdateStatus(totalNumLoans, loanContract, StatusType.NEW);

        return totalNumLoans;
    }

    /**
     * @notice Mints a Promissory Note SmartNFT for the lender. Must be called by corresponding loan type
     *
     * @param _loanId - The ID of the loan.
     * @param _lender - The address of the lender.
     */
    function mintPromissoryNote(uint32 _loanId, address _lender) external onlyInitialized {
        address loanContract = msg.sender;

        if (_typeOfLoanContract[loanContract] == bytes32(0)) revert NotRegisteredLoanContract();

        // create smartNFTid to match the id of the promissory note if promissory note doens't exist
        uint64 smartNftId = loans[_loanId].smartNftId;
        if (smartNftId == 0) {
            smartNftIdCounter += 1;
            smartNftId = uint64(uint256(keccak256(abi.encodePacked(address(this), smartNftIdCounter))));
        }

        if (loans[_loanId].status != StatusType.NEW) revert LoanStatusMustBeNEW();
        if (SmartNft(promissoryNoteToken).exists(smartNftId)) revert PromissoryNoteAlreadyExists();

        loans[_loanId].smartNftId = smartNftId;
        // Issue an ERC721 promissory note to the lender that gives them the
        // right to either the principal-plus-interest or the collateral.
        SmartNft(promissoryNoteToken).mint(_lender, smartNftId, abi.encode(_loanId));
    }

    /**
     * @notice Mints an Obligation Receipt SmartNFT for the borrower. Must be called by corresponding loan type
     *
     * @param _loanId - The ID of the loan.
     * @param _borrower - The address of the borrower.
     */
    function mintObligationReceipt(uint32 _loanId, address _borrower) external override onlyInitialized {
        address loanContract = msg.sender;

        if (_typeOfLoanContract[loanContract] == bytes32(0)) revert NotRegisteredLoanContract();

        // create smartNFTid to match the id of the promissory note if promissory note doens't exist
        uint64 smartNftId = loans[_loanId].smartNftId;
        if (smartNftId == 0) {
            smartNftIdCounter += 1;
            smartNftId = uint64(uint256(keccak256(abi.encodePacked(address(this), smartNftIdCounter))));
        }

        if (loans[_loanId].status != StatusType.NEW) revert LoanStatusMustBeNEW();
        if (SmartNft(obligationReceiptToken).exists(smartNftId)) revert ObligationReceiptAlreadyExists();

        loans[_loanId].smartNftId = smartNftId;
        // Issue an ERC721 obligation receipt to the borrower that gives them the
        // right to pay back the loan and get the collateral back.
        SmartNft(obligationReceiptToken).mint(_borrower, smartNftId, abi.encode(_loanId));
    }

    /**
     * @notice Resets the SmartNFTs associated with a loan.
     *
     * @param _loanId - The ID of the loan.
     */
    function resetSmartNfts(uint32 _loanId) external override onlyInitialized {
        address loanContract = msg.sender;

        if (_typeOfLoanContract[loanContract] == bytes32(0)) revert NotRegisteredLoanContract();

        uint64 oldSmartNftId = loans[_loanId].smartNftId;
        if (loans[_loanId].status != StatusType.NEW) revert LoanStatusMustBeNEW();

        if (SmartNft(promissoryNoteToken).exists(oldSmartNftId)) {
            SmartNft(promissoryNoteToken).burn(oldSmartNftId);
        }

        if (SmartNft(obligationReceiptToken).exists(oldSmartNftId)) {
            SmartNft(obligationReceiptToken).burn(oldSmartNftId);
        }
    }

    /**
     * @dev This is called by the OfferType who created the loan, when a loan is resolved whether by paying back or
     * liquidating the loan.
     * It sets the loan as `RESOLVED` and burns both PromossoryNote and ObligationReceipt SmartNft's.
     *
     * @param _loanId - Id of the loan
     */
    function resolveLoan(uint32 _loanId, bool _repaid) external override onlyInitialized {
        Loan storage loan = loans[_loanId];

        if (loan.status != StatusType.NEW) revert LoanStatusMustBeNEW();

        if (loan.loanContract != msg.sender) revert CallerNotLoanCreatorContract();

        if (_repaid) {
            loan.status = StatusType.REPAID;
        } else {
            loan.status = StatusType.LIQUIDATED;
        }

        if (SmartNft(promissoryNoteToken).exists(loan.smartNftId)) {
            SmartNft(promissoryNoteToken).burn(loan.smartNftId);
        }

        if (SmartNft(obligationReceiptToken).exists(loan.smartNftId)) {
            SmartNft(obligationReceiptToken).burn(loan.smartNftId);
        }

        emit UpdateStatus(_loanId, msg.sender, loan.status);
    }

    /**
     * @dev Returns loan's data for a given id.
     *
     * @param _loanId - Id of the loan
     */
    function getLoanData(uint32 _loanId) external view override returns (Loan memory) {
        return loans[_loanId];
    }

    /**
     * @dev Returns loan's data and offerType for a given loan id.
     *
     * @param _loanId - Id of the loan
     */
    function getLoanDataAndOfferType(uint32 _loanId) external view returns (Loan memory, bytes32) {
        Loan memory loan = loans[_loanId];
        return (loan, _typeOfLoanContract[loan.loanContract]);
    }

    /**
     * @dev checks if the given id is valid for the given loan contract address
     * @param _loanId - Id of the loan
     * @param _loanContract - address og the loan contract
     */
    function isValidLoanId(uint32 _loanId, address _loanContract) external view override returns (bool validity) {
        validity = loans[_loanId].loanContract == _loanContract;
    }

    /**
     * @notice  Set or update the contract address that implements the given Loan Type.
     * Set address(0) for a loan type for un-register such type.
     *
     * @param _offerType - Loan type represented by 'loan type'.
     * @param _loanContract - The address of the wrapper contract that implements the loan type's behaviour.
     */
    function registerOfferType(string memory _offerType, address _loanContract) external onlyOwner {
        _registerOfferType(_offerType, _loanContract);
    }

    /**
     * @notice Deletes the contract address associated with a given Loan Type.
     *
     * @param _offerType - Loan type represented by 'loan type'.
     * @param _loanContract - The address of the wrapper contract to be deleted.
     */
    function deleteOfferType(string memory _offerType, address _loanContract) external onlyOwner {
        bytes32 offerTypeKey = ContractKeyUtils.getIdFromStringKey(_offerType);

        delete _typeOfLoanContract[_loanContract];
        if (_defaultLoanContractForOfferType[offerTypeKey] == _loanContract) {
            delete _defaultLoanContractForOfferType[offerTypeKey];
        }
    }

    /**
     * @notice Disables a loan contract. Makes it impossible for a loan contract to register a new loan,
     * altough renegotiations of their existing loans and repayment/liquidations are still possible
     *
     * @param _loanContract - The address of the loan contract to be disabled.
     */
    function disableLoanContract(address _loanContract) external onlyOwner {
        _isLoanContractDisabled[_loanContract] = true;
    }

    /**
     * @notice Enables a loan contract.
     *
     * @param _loanContract - The address of the loan contract to be enabled.
     */
    function enableLoanContract(address _loanContract) external onlyOwner {
        _isLoanContractDisabled[_loanContract] = false;
    }

    /**
     * @notice  Batch set or update the contract addresses that implement the given batch Loan Type.
     * Set address(0) for a loan type for un-register such type.
     *
     * @param _offerTypes - Loan types represented by 'loan type'.
     * @param _loanContracts - The addresses of each wrapper contract that implements the loan type's behaviour.
     */
    function registerOfferTypes(string[] memory _offerTypes, address[] memory _loanContracts) external onlyOwner {
        _registerOfferTypes(_offerTypes, _loanContracts);
    }

    /**
     * @notice This function can be called by anyone to get the latest
     * contract address that implements the given loan type.
     *
     * @param  _offerType - The loan type, e.g. bytes32("ASSET_OFFER_LOAN")
     */
    function getDefaultLoanContractForOfferType(bytes32 _offerType) public view override returns (address) {
        return _defaultLoanContractForOfferType[_offerType];
    }

    /**
     * @notice This function can be called by anyone to get the loan type of the given contract address.
     *
     * @param  _loanContract - The loan contract
     */
    function getTypeOfLoanContract(address _loanContract) public view override returns (bytes32) {
        return _typeOfLoanContract[_loanContract];
    }

    /**
     * @notice Checks if a loan contract is disabled.
     *
     * @param _loanContract - The loan contract address.
     * @return bool - True if disabled, false otherwise.
     */
    function isLoanContractDisabled(address _loanContract) external view returns (bool) {
        return _isLoanContractDisabled[_loanContract];
    }

    /**
     * @notice  Set or update the contract address that implements the given Loan Type.
     * Set address(0) for a loan type for un-register such type.
     *
     * @param _offerType - Loan type represented by 'loan type').
     * @param _loanContract - The address of the wrapper contract that implements the loan type's behaviour.
     */
    function _registerOfferType(string memory _offerType, address _loanContract) internal {
        if (bytes(_offerType).length == 0) revert OfferTypeIsEmpty();
        bytes32 offerTypeKey = ContractKeyUtils.getIdFromStringKey(_offerType);

        // delete loan contract address of old typeKey registered to this loan contract address

        if (_typeOfLoanContract[_loanContract] != bytes32(0)) revert LoanContractAlreadyRegistered();

        _defaultLoanContractForOfferType[offerTypeKey] = _loanContract;
        _typeOfLoanContract[_loanContract] = offerTypeKey;

        emit TypeUpdated(offerTypeKey, _loanContract);
    }

    /**
     * @notice  Batch set or update the contract addresses that implement the given batch Loan Type.
     * Set address(0) for a loan type for un-register such type.
     *
     * @param _offerTypes - Loan types represented by keccak256('loan type').
     * @param _loanContracts - The addresses of each wrapper contract that implements the loan type's behaviour.
     */
    function _registerOfferTypes(string[] memory _offerTypes, address[] memory _loanContracts) internal {
        if (_offerTypes.length != _loanContracts.length) revert FunctionInformationArityMismatch();

        for (uint256 i; i < _offerTypes.length; ++i) {
            _registerOfferType(_offerTypes[i], _loanContracts[i]);
        }
    }

    /**
     * @notice This function can be called by either a lender or a borrower to cancel all off-chain orders that they
     * have signed that contain this nonce. If the off-chain orders were created correctly, there should only be one
     * off-chain order that contains this nonce at all.
     *
     * The nonce referred to here is not the same as an Ethereum account's nonce. We are referring
     * instead to nonces that are used by both the lender and the borrower when they are first signing off-chain NFTfi
     * orders. These nonces can be any uint256 value that the user has not previously used to sign an off-chain order.
     * Each nonce can be used at most once per user within NFTfi, regardless of whether they are the lender or the
     * borrower in that situation. This serves two purposes. First, it prevents replay attacks where an attacker would
     * submit a user's off-chain order more than once. Second, it allows a user to cancel an off-chain order by calling
     * NFTfi.cancelLoanCommitment(), which marks the nonce as used and prevents any future loan from
     * using the user's off-chain order that contains that nonce.
     *
     * @param  _nonce - User nonce
     */
    function cancelLoanCommitment(bytes32 _offerType, uint256 _nonce) external {
        if (_nonceHasBeenUsedForUserByOfferType[_offerType][msg.sender][_nonce]) {
            revert InvalidNonce();
        }
        _nonceHasBeenUsedForUserByOfferType[_offerType][msg.sender][_nonce] = true;
    }

    /**
     * @notice This function can be used to view whether a particular nonce for a particular user has already been used,
     * either from a successful loan or a cancelled off-chain order.
     *
     * @param _user - The address of the user. This function works for both lenders and borrowers alike.
     * @param  _nonce - The nonce referred to here is not the same as an Ethereum account's nonce. We are referring
     * instead to nonces that are used by both the lender and the borrower when they are first signing off-chain
     * NFTfi orders. These nonces can be any uint256 value that the user has not previously used to sign an off-chain
     * order. Each nonce can be used at most once per user within NFTfi, regardless of whether they are the lender or
     * the borrower in that situation. This serves two purposes:
     * - First, it prevents replay attacks where an attacker would submit a user's off-chain order more than once.
     * - Second, it allows a user to cancel an off-chain order by calling NFTfi.cancelLoanCommitment()
     * , which marks the nonce as used and prevents any future loan from using the user's off-chain order that contains
     * that nonce.
     *
     * @return A bool representing whether or not this nonce has been used for this user.
     */
    function getWhetherNonceHasBeenUsedForUser(
        bytes32 _offerType,
        address _user,
        uint256 _nonce
    ) external view returns (bool) {
        return _nonceHasBeenUsedForUserByOfferType[_offerType][_user][_nonce];
    }

    /**
     * @notice Checks if a nonce is valid.
     *
     * @param _user - The address of the user.
     * @param _nonce - The nonce to be checked.
     */
    function checkNonce(address _user, uint256 _nonce) public view override {
        bytes32 offerType = _typeOfLoanContract[msg.sender];
        if (_nonceHasBeenUsedForUserByOfferType[offerType][_user][_nonce]) {
            revert InvalidNonce();
        }
    }

    /**
     * @notice Checks and invalidates a nonce for a user.
     *
     * @param _user - The address of the user.
     * @param _nonce - The nonce to be checked and invalidated.
     */
    function checkAndInvalidateNonce(address _user, uint256 _nonce) external override {
        bytes32 offerType = _typeOfLoanContract[msg.sender];
        if (_nonceHasBeenUsedForUserByOfferType[offerType][_user][_nonce]) {
            revert InvalidNonce();
        }
        _nonceHasBeenUsedForUserByOfferType[offerType][_user][_nonce] = true;
    }
}
