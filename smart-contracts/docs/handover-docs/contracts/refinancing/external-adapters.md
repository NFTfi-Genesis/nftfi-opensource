# External Adapters

## Purpose

These adapters let the protocol refinance positions originating outside the current NFTfi loan contracts.

Main files:

- `contracts/refinancing/refinancingAdapters/ArcadeRefinancingAdapter.sol`
- `contracts/refinancing/refinancingAdapters/BlendRefinancingAdapter.sol`
- `contracts/refinancing/refinancingAdapters/GondiRefinancingAdapter.sol`

The important design principle is that each external protocol gets its own adapter because borrower control, payoff semantics, and collateral retrieval differ materially across protocols.

## `ArcadeRefinancingAdapter`

Arcade uses explicit borrower notes.

Adapter behavior:

- borrower is current owner of `borrowerNote`
- borrower role transfer moves the borrower note NFT to the refinancing contract
- payoff uses `IRepaymentController.repay`
- collateral and payoff are read from Arcade loan core structures

This is the closest external protocol to the NFTfi note-transfer model because it has a transferable borrower-side token.

## `BlendRefinancingAdapter`

Blend relies heavily on off-chain/event-derived lien data, passed into the adapter as `_extraData`.

Adapter behavior:

- borrower is decoded from lien data rather than queried from protocol storage
- borrower-role transfer is effectively a no-op
- payoff unwraps WETH to ETH, deposits into Blur pool, then calls `repay`
- collateral and payoff details are reconstructed from the lien data

This is a very different model from NFTfi and Arcade because the adapter depends on externally supplied lien context.

## `GondiRefinancingAdapter`

Gondi also relies on `_extraData`, here carrying encoded repayment data.

Adapter behavior:

- borrower is decoded from Gondi repayment data
- borrower-role transfer is also effectively a no-op
- payoff verifies the supplied loan id matches tranche data
- payoff sends tokens to borrower and then calls Gondi `repayLoan`
- repayment amount is computed from tranche principal plus accrued/new interest

The adapter contains protocol-specific repayment math rather than delegating that entirely to the third-party contract.

## External Adapter Comparison

### Borrower control

- Arcade: transferable borrower note
- Blend: no borrower-role transfer, borrower inferred from supplied lien data
- Gondi: no borrower-role transfer, borrower inferred from supplied repayment data

### Payoff input source

- Arcade: protocol storage
- Blend: supplied lien data
- Gondi: supplied repayment data plus local interest computation

### Collateral source

- Arcade: protocol storage
- Blend: supplied lien data
- Gondi: supplied repayment data

## Deployment Notes

These adapters are not all wired the same way across deploy scripts.

Important repo detail:

- `deploy/009_deploy_Refinancing.ts` focuses on NFTfi and legacy NFTfi setup
- `deploy/13_deploy_ArcadeRefiAdapter.ts` can register Arcade separately
- `deploy/015_redeploy_Refinancing.ts` rebuilds a richer refinancing setup including Arcade, Blend, and Gondi

So the active deployment path determines which third-party refinanceables are available.

## Important Behavioral Notes

### `_extraData` is part of the protocol surface

For Blend and Gondi especially, refinancing is not just “provide contract and loan id”. The caller must also provide correctly encoded protocol-specific context.

### Not every protocol has a transferable borrower role

The refinancing system supports both:

- note-transfer style takeover
- no-op borrower-role transfer models

That flexibility is why the adapter interface is broad.

## What To Read Next

- [Refinancing Core](./refinancing-core.md)
- [Adapter Registry](./adapter-registry.md)
