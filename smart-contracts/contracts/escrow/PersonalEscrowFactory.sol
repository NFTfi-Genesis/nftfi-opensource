// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";
import {Pausable} from "@openzeppelin/contracts/security/Pausable.sol";
import {Ownable} from "../utils/Ownable.sol";

import {PersonalEscrow} from "./PersonalEscrow.sol";
import {IPersonalEscrowFactory} from "../interfaces/IPersonalEscrowFactory.sol";

/**
 * @title PersonalEscrowFactory
 * @author NFTfi
 * @notice Used to deploy new personal escrow contracts for specific users
 */
contract PersonalEscrowFactory is IPersonalEscrowFactory, Ownable, Pausable {
    // solhint-disable-next-line immutable-vars-naming
    address public immutable personalEscrowImplementation;
    string public baseURI;

    // Incremental token id
    uint256 public tokenCount = 0;

    mapping(address owner => address escrow) private _personalEscrowOfOwner;

    mapping(address => bool) private _isPersonalEscrow;

    event PersonalEscrowCreated(address indexed instance, address indexed owner, address creator);

    error PersonalEscrowAlreadyExistsForUser();

    /**
     * @param _personalEscrowImplementation - deployed master copy of the personal escrow contract
     */
    constructor(address _personalEscrowImplementation, address _admin) Ownable(_admin) {
        personalEscrowImplementation = _personalEscrowImplementation;
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
     * @dev clones a new personal escrow contract
     */

    function createPersonalEscrow() external whenNotPaused returns (address) {
        if (_personalEscrowOfOwner[msg.sender] != address(0)) revert PersonalEscrowAlreadyExistsForUser();
        address instance = Clones.clone(personalEscrowImplementation);
        _personalEscrowOfOwner[msg.sender] = instance;
        _isPersonalEscrow[instance] = true;
        PersonalEscrow(instance).initialize(msg.sender);
        emit PersonalEscrowCreated(instance, msg.sender, msg.sender);
        return instance;
    }

    /**
     * @dev retunrs escrow address of the owner
     * @return address of the personal escrow
     */
    function personalEscrowOfOwner(address _owner) external view returns (address) {
        return _personalEscrowOfOwner[_owner];
    }

    /**
     * @dev checks if the address is a personal escrow
     * @return bool true if the address is a personal escrow
     */
    function isPersonalEscrow(address _escrow) external view returns (bool) {
        return _isPersonalEscrow[_escrow];
    }
}
