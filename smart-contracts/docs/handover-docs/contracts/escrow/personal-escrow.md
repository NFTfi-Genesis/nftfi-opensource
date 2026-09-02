# Personal Escrow

## Purpose

`PersonalEscrow` and `PersonalEscrowFactory` provide borrower-specific custody contracts that can hold reusable collateral inventory outside the shared global escrow.

Main files:

- `contracts/escrow/PersonalEscrow.sol`
- `contracts/escrow/PersonalEscrowFactory.sol`
- `deploy/004_deploy_PersonalEscrow.ts`

This layer exists so a borrower can have a dedicated escrow contract instead of always moving collateral through the shared global escrow.

## `PersonalEscrow`

### Core idea

`PersonalEscrow` inherits `Escrow`, but changes the custody behavior to support pre-positioned collateral.

Key difference from global escrow:

- if the personal escrow already owns an unlocked copy of the collateral, a loan can lock it without pulling it in from the borrower again

This is especially relevant for repeated usage of the same borrower-controlled custody account.

### Initialization model

The implementation contract is deployed once with a null owner and then cloned.

Each clone is initialized via:

- `initialize(owner)`

That makes ownership per-instance rather than on the implementation.

### Locking behavior

`PersonalEscrow.lockCollateral` first checks wrapper-reported balance against already locked amount.

If balance exceeds locked amount:

- it only records a new lock

Otherwise:

- it records the lock and transfers the NFT in from the borrower

This is the main behavioral difference from `Escrow`, which always transfers in during lock.

### Unlocking and handover behavior

`PersonalEscrow` supports:

- `unlockCollateral`
- `handOverCollateralToEscrow`
- `unlockAndKeepCollateral`

These allow:

- normal release to a recipient
- approval-based handover into the global escrow during note/lifecycle transitions
- removal of the lock without transferring out, so the asset stays parked in the personal escrow

That last path is important during normal payback when the borrower wants custody to remain in their personal escrow rather than return directly to their EOA.

### Plugin policy

Unlike global escrow, `PersonalEscrow` forbids plugin management.

Both:

- `addPlugin`
- `removePlugin`

always revert.

This is a deliberate narrowing of the extension surface for borrower-specific custody.

## `PersonalEscrowFactory`

### Role

The factory creates one clone per borrower.

Core properties:

- immutable implementation address
- one personal escrow per owner
- paused by default at deployment
- clone-based deployment using OpenZeppelin `Clones`

### `createPersonalEscrow`

When unpaused, a user can create their escrow if one does not already exist.

Factory behavior:

1. reject duplicate escrow creation for the same owner
2. clone the implementation
3. mark the clone as a recognized personal escrow
4. initialize the clone with the caller as owner
5. emit `PersonalEscrowCreated`

### Lookup functions

The factory exposes:

- `personalEscrowOfOwner`
- `isPersonalEscrow`

The loan base layer uses these to decide whether to route collateral into personal or global escrow.

## Interaction With Loan Logic

The base loan layer uses the factory in two important ways:

- `getEscrowAddress(borrower)` prefers personal escrow when it exists
- obligation-receipt minting can move collateral from personal escrow into global escrow because note ownership may become transferable while personal escrow ownership is fixed to one borrower

So personal escrow is not just "another custody option". It changes the lifecycle until transferable borrower rights need to be represented externally.

## Important Behavioral Notes

### One borrower, one escrow

The factory enforces a single personal escrow per owner.

### Paused by default

Personal escrow creation is an explicitly controlled operational feature, not something that is always live by default.

### Personal escrow is ownership-bound

That is why some flows must migrate collateral back into global escrow when the borrower's rights are externalized into an obligation receipt.

## What To Read Next

- [Global Escrow](./global-escrow.md)
- [Loan Coordinator And Smart NFTs](../loan-coordinator-and-smart-nfts.md)
