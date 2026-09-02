// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";

import {INftfiHub} from "./interfaces/INftfiHub.sol";
import {Ownable} from "./utils/Ownable.sol";
import {ContractKeys} from "./utils/ContractKeys.sol";
import {LoanCoordinator} from "./loans/LoanCoordinator.sol";

import {IERC20TransferManager} from "./interfaces/IERC20TransferManager.sol";

contract ERC20TransferManager is IERC20TransferManager, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // solhint-disable-next-line immutable-vars-naming
    INftfiHub public immutable hub;

    /**
     * @dev keeps track of payed back erc20 tokens being held in escrow of finished loans, so we dont allow these
     * to be transferred with the aridrop draining functions
     * token contract => amount
     */
    mapping(address => uint256) private _escrowErc20Tokens;

    /**
     * @dev keeps track of payed back erc20 tokens being held in escrow of finished loans for each lender
     * lender => token contract => amount
     */
    mapping(address => mapping(address => uint256)) private _payBackEscrow;

    /**
     * @notice This event is fired whenever a loan is repaid into escrow
     *
     * @param  recipient - A unique identifier for this particular loan, sourced from the Loan Coordinator.
     */
    event EscrowRepay(address indexed recipient);

    error OnlyLoanContract();
    error NoTokensOwned();
    error TokensInEscrow();
    error NoTokensInEscrow();

    /**
     * @notice Sets the admin of the contract.
     * Initializes `contractTypes` with a batch of loan types. Sets `NftfiHub`.
     *
     * @param  _nftfiHub - Address of the NftfiHub contract
     * @param _admin - Initial admin of this contract.
     */
    constructor(address _admin, address _nftfiHub) Ownable(_admin) {
        hub = INftfiHub(_nftfiHub);
    }

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
     * @notice Transfers ERC20 tokens from sender to recipient.
     * @param _token Address of the ERC20 token contract
     * @param _sender Address of the sender
     * @param _recipient Address of the recipient
     * @param _amount Amount of tokens to transfer
     */
    function transfer(address _token, address _sender, address _recipient, uint256 _amount) external override onlyLoan {
        IERC20(_token).safeTransferFrom(_sender, _recipient, _amount);
    }

    /**
     * @notice Safely transfers loan payback from sender to recipient, with escrow fallback on failure.
     * @param _token Address of the ERC20 token contract
     * @param _sender Address of the sender
     * @param _recipient Address of the recipient
     * @param _amount Amount of tokens to transfer
     */
    function safeLoanPaybackTransfer(
        address _token,
        address _sender,
        address _recipient,
        uint256 _amount
    ) external onlyLoan {
        // use try to detect the case of erc20 transfer failing for some reason (e.g. USDC blacklisted address)
        try IERC20(_token).transferFrom(_sender, _recipient, _amount) {
            // solhint-disable-previous-line no-empty-blocks
        } catch {
            // if ERC20 transfer fails, we store the amount in escrow in this contract
            IERC20(_token).safeTransferFrom(_sender, address(this), _amount);
            _payBackEscrow[_recipient][_token] += _amount;
            _escrowErc20Tokens[_token] += _amount;
            emit EscrowRepay(_recipient);
        }
    }

    /**
     * @notice Safely transfers admin fee from sender to recipient, with escrow fallback on failure.
     * @param _token Address of the ERC20 token contract
     * @param _sender Address of the sender
     * @param _recipient Address of the recipient
     * @param _amount Amount of tokens to transfer
     */
    function safeAdminFeeTransfer(
        address _token,
        address _sender,
        address _recipient,
        uint256 _amount
    ) external override onlyLoan {
        // Transfer fees from the caller to admins
        // try is here so if for whatever reason (USCD blacklist specifically) this
        // transfer would fail the borrowerr still can pay back and get their nft back
        // admin fee can be later drained by us
        try IERC20(_token).transferFrom(_sender, _recipient, _amount) {
            // solhint-disable-previous-line no-empty-blocks
        } catch {
            IERC20(_token).safeTransferFrom(_sender, address(this), _amount);
        }
    }

    /**
     * @notice Used for lenders to get their payback from escrow,
     * in case the direct loan payback didn't work, because it caused a revert.
     *
     * @param _token  ERC20 token conract address
     */
    function getEscrowedPayBack(address _token) external nonReentrant {
        uint256 amount = _payBackEscrow[msg.sender][_token];
        if (amount == 0) {
            revert NoTokensInEscrow();
        }
        IERC20(_token).safeTransfer(msg.sender, amount);
        delete _payBackEscrow[msg.sender][_token];
        _escrowErc20Tokens[_token] -= amount;
    }

    /**
     * @notice used by the owner account to be able to drain stuck ERC20 tokens
     * @param _tokenAddress - address of the token contract for the token to be sent out
     * @param _receiver - receiver of the token
     */
    function drainERC20Airdrop(address _tokenAddress, uint256 amount, address _receiver) external onlyOwner {
        IERC20 tokenContract = IERC20(_tokenAddress);
        uint256 balance = tokenContract.balanceOf(address(this));
        if (balance == 0) {
            revert NoTokensOwned();
        }
        if (balance - _escrowErc20Tokens[_tokenAddress] < amount) {
            revert TokensInEscrow();
        }
        tokenContract.safeTransfer(_receiver, amount);
    }
}
