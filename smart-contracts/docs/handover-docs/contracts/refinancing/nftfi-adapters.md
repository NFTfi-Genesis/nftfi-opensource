# NFTfi Adapters

## Purpose

These adapters handle refinance flows for NFTfi-native and older NFTfi loan contracts.

Main files:

- `contracts/refinancing/refinancingAdapters/NftfiRefinancingAdapter.sol`
- `contracts/refinancing/refinancingAdapters/LegacyNftfiRefinancingAdapterV2_1.sol`
- `contracts/refinancing/refinancingAdapters/LegacyNftfiRefinancingAdapterV2_3.sol`

## Common Pattern

All three adapters follow the same broad model:

1. locate the borrower by obligation-receipt ownership
2. transfer the obligation receipt into the refinancing contract
3. query collateral and payoff details from the old loan contract
4. pay the old loan off through its own repayment path

This works because NFTfi loans expose a borrower-side note model that the adapter can use directly.

## `NftfiRefinancingAdapter`

This is the adapter for current NFTfi loan contracts in this repo.

Notable behavior:

- borrower is determined from the current owner of the obligation receipt note
- `transferBorrowerRole` transfers that obligation receipt to the refinancing contract
- payoff goes through `LoanBaseMinimal.payBackLoan`
- before calling payback, the adapter approves the old loan contract's ERC20 transfer manager rather than approving the loan contract directly

That last point matters because current NFTfi loans route repayment token movement through `ERC20TransferManager`.

## Legacy NFTfi adapters

### `LegacyNftfiRefinancingAdapterV2_1`

### `LegacyNftfiRefinancingAdapterV2_3`

These adapters are for older NFTfi loan contracts with slightly different payoff and storage expectations.

Common behavior:

- borrower still comes from obligation receipt ownership
- borrower role transfer still means transferring the obligation receipt NFT
- payoff approves the loan contract directly
- collateral/payoff data is read from legacy `loanIdToLoan` storage layout via `ILegacyDirectLoanBase`

Important difference from current NFTfi:

- current NFTfi adapter understands the ERC20 transfer manager indirection
- legacy adapters assume the old loan contract itself is the spending target for repayment approval

## Why Separate Adapters Exist

Even when the external protocol is “NFTfi”, version differences in:

- note handling
- repayment approval path
- storage layout

are enough to justify separate adapters.

Keeping them split reduces the amount of version-conditional logic hidden inside one adapter contract.

## Deployment Notes

The deployment scripts register current NFTfi adapters by type, then add specific current or legacy contract addresses as refinanceables.

Examples from the deploy scripts:

- current `AssetOfferLoan`
- current `CollectionOfferLoan`
- selected v2.1 / v2.3 legacy mainnet or sepolia contract addresses

So the adapter contract and the refinanceable contract list are both part of the active configuration.

## What To Read Next

- [External Adapters](./external-adapters.md)
- [Refinancing Core](./refinancing-core.md)
