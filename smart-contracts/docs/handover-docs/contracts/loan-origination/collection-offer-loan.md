# Collection Offer Loan

## Purpose

`CollectionOfferLoan` is the concrete loan contract used for lender-signed offers that target an NFT collection rather than one exact token id.

Main file:

- `contracts/loans/loanTypes/CollectionOfferLoan.sol`

It inherits `AssetOfferLoan`, then modifies origination semantics so a lender can post a reusable collection-level offer.

## What Makes It Distinct

The signed offer is not bound to one exact `nftCollateralId`.

Instead:

- any borrower can accept against the specified NFT contract
- the lender nonce is checked for cancellation, but not consumed on every use
- the exact collateral id is neutralized during signature validation
- an optional id-range flow exists for collection subsets that share one NFT contract

This is why the contract can be used as a standing collection offer rather than a one-off asset offer.

## Public Entry Points

### `acceptOffer`

The inherited generic `acceptOffer` is deliberately disabled here and always reverts with `OriginalAcceptOfferDisabled`.

That is an important behavioral guard: this contract is not meant to accept the asset-specific signature flow.

### `acceptCollectionOffer`

This is the standard collection-offer entrypoint.

High-level flow:

1. resolve wrapper through permitted NFT registry
2. run shared loan sanity checks
3. run the same offer-economics checks used by `AssetOfferLoan`
4. build loan terms for the borrower's chosen token id
5. check lender nonce without invalidating it
6. rewrite the offer copy so `nftCollateralId = 0`
7. validate signature against the collection-offer semantics
8. create the loan
9. emit `LoanStarted`

### `acceptCollectionOfferWithIdRange`

This is the collection-offer variant for collections partitioned by token-id ranges on a shared contract.

Additional behavior:

- validates `minId <= maxId`
- checks the borrower's chosen collateral id is inside the allowed range
- validates signature using `NFTfiCollectionOfferSigningUtils`

## Signature And Nonce Behavior

### Reusable nonce model

Collection offers use a different nonce model from asset offers.

At origination:

- the contract only calls `checkNonce`
- it does not call `checkAndInvalidateNonce`

Implication:

- one lender signature can back multiple loans until the lender cancels the nonce or their balance/allowance can no longer support new loans

This is the core reusable-offer property of the collection flow.

### Collateral id normalization

Before signature verification, the contract copies the offer and sets:

- `offerToCheck.nftCollateralId = 0`

That makes the signature collection-scoped rather than token-scoped.

### Id-range signatures

For ranged collection offers, the contract additionally validates:

- `CollectionIdRange`
- borrower collateral id containment within the range

The signing path moves from the base signing utils to `NFTfiCollectionOfferSigningUtils`.

## Relationship To `AssetOfferLoan`

`CollectionOfferLoan` inherits nearly all of the shared loan lifecycle behavior from:

- `LoanBaseMinimal`
- `AssetOfferLoan`

It mainly overrides origination semantics, not repayment or liquidation semantics.

What it reuses:

- loan-term construction
- escrow selection
- repayment logic
- liquidation logic
- admin settings
- interest and payoff behavior

What it changes:

- entrypoints
- nonce usage
- signature validation
- optional id-range enforcement

## Economics

The same economic checks inherited from `AssetOfferLoan` still apply:

- no negative-interest configuration
- origination fee must be strictly smaller than principal

Repayment behavior is also inherited, so the fixed vs pro-rata split still depends on the `isProRata` field in the offer and stored loan terms.

## Important Behaviors To Preserve In Future Docs

### This contract intentionally supports repeated use of one signature

That is the main reason it differs from `AssetOfferLoan`.

### The token id is chosen by the borrower within the allowed collection scope

That means collection offers create a broader lender exposure surface than asset-specific offers.

### The inherited `acceptOffer` path is disabled on purpose

That is not an omission. It is a guardrail to stop callers from using the wrong signing semantics.

## What To Read Next

The next most relevant page is:

- [Loan Coordinator And Smart NFTs](../loan-coordinator-and-smart-nfts.md)

That page explains how newly-created loans become note-bearing protocol objects with transferable lender and borrower positions.
