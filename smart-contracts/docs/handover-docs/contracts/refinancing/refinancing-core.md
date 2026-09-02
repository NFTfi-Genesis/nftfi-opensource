# Refinancing Core

## Purpose

`Refinancing` is the protocol contract that pays off an old refinanceable position and originates a replacement NFTfi loan against the same collateral.

Main files:

- `contracts/refinancing/Refinancing.sol`
- `contracts/refinancing/flashloan/Flashloan.sol`
- `deploy/009_deploy_Refinancing.ts`
- `deploy/015_redeploy_Refinancing.ts`

This is one of the most orchestration-heavy parts of the repo. It sits between:

- existing refinanceable positions
- adapter contracts
- flashloan and swap infrastructure
- NFT wrappers
- target NFTfi loan contracts

## High-Level Model

The refinancing contract does not know the internals of every refinanceable protocol itself.

Instead, it:

1. resolves an adapter for the old position
2. uses that adapter to inspect and take over the old position
3. obtains funds via dYdX flashloan, optionally swapping through WETH
4. pays off the old position
5. ensures it controls the collateral
6. approves collateral into the target NFTfi loan flow
7. starts a fresh NFTfi loan
8. sends the new obligation receipt back to the borrower

The contract is therefore an execution coordinator more than a standalone lending primitive.

## User-Facing Entry Points

The contract exposes three refinance entrypoints:

- `refinanceLoan`
- `refinanceCollectionOfferLoan`
- `refinanceCollectionRangeOfferLoan`

These map to the target NFTfi loan type the borrower wants to end up in:

- asset offer loan
- collection offer loan
- collection offer loan with id range

The old position being refinanced may be current NFTfi, legacy NFTfi, or an external protocol, as long as an adapter is registered.

## Core Data

### `RefinancingData`

This struct identifies the old position:

- `loanIdentifier`
- `refinanceableContract`

### `TargetLoanType`

This enum identifies the new NFTfi loan type to create:

- `LOAN_OFFER`
- `COLLECTION_OFFER`
- `COLLECTION_RANGE_OFFER`

### `latestRefinancedLoanId`

The contract stores the most recently created replacement loan id so it can mint and forward the corresponding obligation receipt after the refinancing sequence finishes.

## Main Flow

### Step 1: Identify borrower and payoff details

`_refinance` first:

- resolves the adapter from `RefinancingAdapterRegistry`
- asks the adapter for borrower address
- asks the adapter for payoff token and payoff amount

If the adapter returns a borrower address, it must match `msg.sender`.

This is how the protocol enforces that only the borrower can initiate refinance where borrower identity is meaningful.

### Step 2: Take over borrower-side control of the old position

The contract calls adapter `transferBorrowerRole`.

Depending on protocol, that may mean:

- transfer obligation receipt / borrower note into the refinancing contract
- do nothing if no transferable borrower role exists

This is adapter-specific and one of the main reasons adapters exist.

### Step 3: Determine flashloan and swap path

The contract checks whether the payoff token is directly flashloanable from dYdX.

If it is:

- flashloan that token directly

If it is not:

- flashloan WETH
- swap WETH into the payoff token during callback

This is driven by:

- `tokenFlashloanble`
- `marketIds`
- Uniswap-based swap helpers inherited from `SwapFlashloanWETH`

### Step 4: Flashloan callback executes the real refinance

The callback sequence inside `_refinanceFlashloanCallback` is the core transaction:

1. query collateral details from adapter
2. query payoff details again
3. swap from WETH if needed
4. pay off the old refinanceable via adapter
5. verify collateral is now owned either by this contract or by borrower
6. if borrower still owns it, pull it into the refinancing contract
7. cover any deficit from borrower if flashloan cost exceeds net new principal
8. approve collateral toward the target NFTfi escrow path
9. start the new NFTfi loan
10. swap back to WETH if necessary and approve dYdX repayment

## Collateral Handling

The refinancing contract relies on the same wrapper model as the rest of the protocol.

It uses wrapper `delegatecall` for:

- ownership checks
- transfers
- approvals

Important consequence:

- refinancing only works for collateral supported by the permitted NFT registry and its wrappers

If the collateral type is unsupported, the flow reverts with `unsupportedCollateral` or wrapper-related failure.

## Target Loan Creation

The target loan contracts are stored as mutable addresses:

- `targetLoanOfferContract`
- `targetLoanCollectionOfferContract`

The refinancing contract starts the replacement loan by directly calling:

- `AssetOfferLoan.acceptOffer`
- `CollectionOfferLoan.acceptCollectionOffer`
- `CollectionOfferLoan.acceptCollectionOfferWithIdRange`

After origination:

- the new loan id is recorded
- `mintObligationReceipt` is called on the new loan
- the resulting obligation receipt NFT is transferred from the refinancing contract back to the borrower

This means the refinancing contract temporarily becomes the borrower-side actor during origination, then hands the borrower position back via the note token.

## Flashloan Layer

`Flashloan` provides the dYdX `SoloMargin` integration.

Key behaviors:

- loads flashloanable market tokens from dYdX
- stores market id per token
- constructs `Withdraw -> Call -> Deposit` operation triplets
- expects `callFunction` callback in `Refinancing`

Important point:

- flashloan support is not universal for every token
- unsupported payoff tokens route through WETH swap logic instead

## Admin Surface

Owner-controlled functions on `Refinancing` include:

- `pause`
- `unpause`
- `setFlashloanFee`
- `setTargetLoanOfferContract`
- `settargetLoanCollectionOfferContract`
- `setSupportedTokenSwapFeeRates`
- `setSupportedTokenSwapFeeRate`

It also inherits the admin surface of `RefinancingAdapterRegistry`.

Operationally, this contract is highly configurable after deployment.

## Important Behavioral Notes

### Refinancing is target-loan-centric

The public entrypoint names are about the new NFTfi loan being created, not the old protocol being exited.

### Adapters are authoritative for old-position behavior

Borrower detection, payoff logic, collateral queries, and borrower-role transfer all come from the adapter.

### Borrower may need to fund a deficit

If flashloan payoff cost is greater than the usable net proceeds of the new loan, the borrower must cover the shortfall during refinance.

### The contract temporarily holds borrower power

It can hold the old borrower role and then later the new obligation receipt before transferring the latter back to the borrower.

## Deployment Notes

There are two relevant deployment shapes in this repo:

- `deploy/009_deploy_Refinancing.ts`: base refinancing setup with core NFTfi adapters and network-specific flashloan/swap settings
- `deploy/015_redeploy_Refinancing.ts`: expanded redeploy path that also includes Arcade, Blend, and Gondi adapters in the constructor setup

This matters because local deployment scripts and deployment artifacts do not necessarily represent one single historical configuration path.

## What To Read Next

- [Adapter Registry](./adapter-registry.md)
- [NFTfi Adapters](./nftfi-adapters.md)
- [External Adapters](./external-adapters.md)
