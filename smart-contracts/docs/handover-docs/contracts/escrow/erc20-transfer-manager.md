# ERC20 Transfer Manager

## Purpose

`ERC20TransferManager` centralizes ERC20 movement for the loan contracts and provides fallback escrow behavior when direct repayment transfers fail.

Main file:

- `contracts/ERC20TransferManager.sol`

This contract exists so the loan contracts do not directly perform all ERC20 transfers themselves.

## Why It Exists

The main reason is failure isolation.

Some ERC20 transfers can fail for reasons unrelated to the borrower's intent to repay, for example blacklist behavior. The transfer manager lets the protocol:

- try the normal transfer path first
- escrow the tokens locally if lender delivery fails
- still let loan resolution continue in certain "safe" repayment paths

## Access Model

All transfer functions are gated by `onlyLoan`.

Like `Escrow`, this checks coordinator registration through the hub. Only registered loan contracts may instruct token movement.

## Main Functions

### `transfer`

Straight `safeTransferFrom` from sender to recipient.

Used when failure should revert the whole action.

### `safeLoanPaybackTransfer`

This is the lender payback fallback path.

Behavior:

1. try direct `transferFrom(sender, recipient, amount)`
2. if it fails, transfer the amount into `ERC20TransferManager`
3. credit `_payBackEscrow[recipient][token]`
4. increase `_escrowErc20Tokens[token]`
5. emit `EscrowRepay`

This is what allows the loan safe-payback flow to complete even if the lender cannot currently receive tokens directly.

### `safeAdminFeeTransfer`

Same idea for admin fees, but simpler:

1. try direct transfer
2. on failure, hold the fee tokens in this contract

There is no lender-style per-user escrow mapping for admin fees because the owner can later recover them via drain flow.

### `getEscrowedPayBack`

Lets a lender withdraw token amounts previously escrowed for them after a failed direct repayment transfer.

This is the lender recovery mechanism for the safe payback flow.

### `drainERC20Airdrop`

Owner-only drain path for stray ERC20 balances, but blocked from draining lender escrowed paybacks.

Constraint:

- `balance - _escrowErc20Tokens[token]` must still cover the requested amount

So lender-owed escrow balances remain protected.

## Important Behavioral Notes

### This contract is part of repayment safety

Without it, a direct lender transfer failure could block payback and therefore trap collateral in cases where the protocol wants to support a safe alternative.

### Escrowed paybacks are lender-specific

Failed lender paybacks are not merged into one undifferentiated pool. They are accounted per recipient and token.

### Safety depends on loan registration

As with escrow, the contract trusts the coordinator's view of what is a valid loan contract.

## What To Read Next

- [Global Escrow](./global-escrow.md)
- [Base Loan Stack](../loan-origination/base-loan-stack.md)
