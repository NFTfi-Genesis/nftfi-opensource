# Base Loan Stack

## Purpose

The base loan stack defines the common state and lifecycle that concrete NFTfi loan contracts build on.

For the current repo, the key contracts and interfaces in this layer are:

- `contracts/loans/loanTypes/LoanData.sol`
- `contracts/loans/BaseLoan.sol`
- `contracts/loans/loanTypes/ILoanBase.sol`
- `contracts/loans/loanTypes/LoanBaseMinimal.sol`

This layer is where loan contracts become protocol-aware. It ties together:

- the hub registry
- the loan coordinator
- escrow selection
- ERC20 permit checks
- collateral transfer through wrappers
- repayment and liquidation state transitions
- renegotiation state changes

## Layer Breakdown

### `LoanData`

`LoanData` is the shared data model for loans, offers, signatures, and collection ranges.

Important structs:

- `LoanTerms`
- `Offer`
- `Signature`
- `CollectionIdRange`

### `LoanTerms`

`LoanTerms` is the stored, on-chain representation of an active loan. It includes:

- principal and repayment cap
- collateral contract and token id
- collateral wrapper address
- denomination token
- duration and start time
- admin fee snapshot
- origination fee
- borrower and lender
- escrow address
- pro-rata vs fixed flag

Two details matter operationally:

- the admin fee is snapshotted into the loan, which prevents a later owner fee change from rewriting economics of existing loans
- the escrow address is part of the stored loan state, so custody is a first-class part of the loan model

### `Offer`

`Offer` is the lender-signed offer shape used at origination. It is narrower than `LoanTerms` because some runtime details, such as the wrapper and resolved escrow, are added by contract logic when the loan is actually created.

### `Signature`

`Signature` carries:

- signer
- nonce
- expiry
- signature bytes

The nonce model here is protocol-level order invalidation, not Ethereum transaction nonce handling.

## `BaseLoan`

`BaseLoan` is intentionally small. It contributes:

- repo-specific `Ownable`
- `Pausable`
- `ReentrancyGuard`

Exposed admin actions:

- `pause()`
- `unpause()`

This contract does not implement origination logic itself. Its role is to enforce the common governance and safety baseline that every concrete loan type inherits.

## `LoanBaseMinimal`

`LoanBaseMinimal` is the real shared core for live loan behavior.

It inherits:

- `ILoanBase`
- `IPermittedERC20s`
- `BaseLoan`
- `LoanData`

It also binds to the wider protocol through:

- `INftfiHub hub`
- `bytes32 LOAN_COORDINATOR`

That makes it the bridge between generic loan state and the rest of the protocol infrastructure.

## Core State

Important stored state in `LoanBaseMinimal`:

- `maximumLoanDuration`
- `adminFeeInBasisPoints`
- `mapping(uint32 => LoanTerms) loanIdToLoan`
- `mapping(uint32 => bool) loanRepaidOrLiquidated`
- renegotiation nonce tracking
- per-contract ERC20 permit mapping
- immutable hub reference

Interpretation:

- `loanIdToLoan` stores the active loan terms keyed by coordinator loan id
- `loanRepaidOrLiquidated` is the terminal-state guard
- ERC20 permissions are local to the loan contract
- renegotiation nonces are distinct from the coordinator's offer nonces

## Admin Surface

`LoanBaseMinimal` exposes several owner-controlled settings:

- `updateMaximumLoanDuration`
- `updateAdminFee`
- `drainNFT`
- `setERC20Permit`
- `setERC20Permits`

Important implications:

### Duration limit is hard-bounded by `uint32`

The maximum duration cannot exceed `uint32.max`, because duration is stored in a 32-bit field in the loan struct.

### Admin fee affects only new loans

Existing loans keep their own snapshotted `loanAdminFeeInBasisPoints`, so `updateAdminFee` changes future loans but not already-created ones.

### ERC20 allowlisting lives in the loan contracts

Although the repo uses the name `PERMITTED_ERC20S` in hub keys, active loan contracts still maintain their own ERC20 permit mapping internally. That is an important implementation detail to preserve in the docs: the abstract name of a shared permission concept and the actual storage location are not the same thing here.

## Lifecycle Responsibilities

`LoanBaseMinimal` does not define the public accept-offer entrypoint for every loan type, but it does define the shared mechanics once a loan is about to exist or already exists.

### Escrow selection

`getEscrowAddress(borrower)` chooses:

- the borrower's personal escrow if one exists
- otherwise the global escrow from the hub

That means escrow selection is borrower-sensitive at origination time.

### Loan creation

The shared creation flow is:

1. choose escrow
2. lock collateral in that escrow
3. register the loan in `LoanCoordinator`
4. store `LoanTerms`
5. transfer principal from lender to borrower through `ERC20TransferManager`
6. emit `LoanCreated`

Important nuance:

- `_createLoan` performs the collateral lock first
- `_createLoanNoNftTransfer` registers and records the loan, then moves funds
- origination fee stays with the lender because the borrower only receives `principal - originationFee`

### Promissory note and obligation receipt minting

`LoanBaseMinimal` includes:

- `mintPromissoryNote`
- `mintObligationReceipt`

These are not automatic in the base layer. The lender and borrower must call them, and once minted the corresponding address field is deleted from stored loan terms.

That design means:

- the canonical owner of each side of the loan can move from an address field into SmartNFT ownership
- downstream logic must sometimes recover lender or borrower identity from the coordinator/note layer instead of directly from `loanIdToLoan`

### Repayment

Repayment is handled through:

- `payBackLoan`
- `payBackLoanSafe`
- internal `_payBackLoan`
- internal `_payBackLoanSafe`

Shared behavior:

- repayment checks are delegated to `LoanChecksAndCalculations`
- payoff and admin fee are computed by the concrete loan type implementation
- token movement goes through `ERC20TransferManager`
- loan state is resolved before collateral release
- collateral is returned through escrow-aware logic

Important design choice:

- repayment is intentionally not pausable

The inline contract rationale is that pausing repayment could trap collateral and let admins hold user NFTs hostage.

### Liquidation

`liquidateOverdueLoan` is also intentionally not pausable.

Shared behavior:

- validates the loan id
- checks terminal state guard
- checks maturity
- requires caller to be lender
- resolves the loan through coordinator
- releases collateral to lender through escrow

### Renegotiation

`renegotiateLoan` updates loan economics without creating a new loan id.

Shared behavior:

- validates loan state and parties through `LoanChecksAndCalculations`
- invalidates lender renegotiation nonce
- validates lender renegotiation signature
- transfers renegotiation fee and admin cut through `ERC20TransferManager`
- updates duration, repayment cap, and pro-rata flag
- may reset SmartNFTs if borrower or lender field had already been moved out of storage

This is a key behavior to capture for future readers: the loan layer supports both refinance-to-new-loan flows and in-place renegotiation flows, and they are not the same mechanism.

## Dependencies On Other Protocol Components

`LoanBaseMinimal` depends on the following hub-resolved services:

- `LOAN_COORDINATOR`
- `PERMITTED_NFTS`
- `ESCROW`
- `PERSONAL_ESCROW_FACTORY`
- `ERC20_TRANSFER_MANAGER`
- `DELEGATE_PLUGIN`

It also depends on NFT wrappers through `delegatecall`.

That dependency pattern means loan contracts are thin on some responsibilities because they outsource them:

- note minting and terminal state to `LoanCoordinator`
- collateral custody to escrow contracts
- token transfer behavior to `ERC20TransferManager`
- NFT transfer semantics to wrapper contracts

## Important Invariants And Behaviors

### Collateral custody is externalized

The loan contract does not have to hold the NFT directly. The active escrow address recorded in `LoanTerms` is part of the authoritative state.

### Repayment and liquidation are terminal

`loanRepaidOrLiquidated` is the local guard, and coordinator resolution burns the associated notes.

### NFT ownership behavior depends on wrappers

Ownership checks and transfers are done through wrapper `delegatecall`, so support for special NFT types is intentionally abstracted away from the core loan contract.

### Personal escrow can be converted to global escrow

When minting the obligation receipt, collateral in personal escrow can be moved to global escrow because obligation receipt ownership can change, while personal escrow is tied to one borrower.

### Delegation is cleaned up on resolution

The base layer checks the delegate-cash plugin and undelegates collateral when a loan is resolved.

## Boundaries Of This Page

This page explains the shared loan substrate.

It does not yet document:

- exact accept-offer logic for `AssetOfferLoan`
- collection-specific acceptance and id-range behavior in `CollectionOfferLoan`
- signature construction details from the signing libraries

Those belong in the next Phase 1 contract pages.

## What To Read Next

From here, the next concrete pages should be:

1. `AssetOfferLoan`
2. `CollectionOfferLoan`
3. loan coordinator and SmartNFT notes
