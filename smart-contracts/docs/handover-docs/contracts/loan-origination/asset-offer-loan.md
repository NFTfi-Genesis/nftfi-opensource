# Asset Offer Loan

## Purpose

`AssetOfferLoan` is the concrete loan contract used for lender-signed offers tied to a specific NFT id.

Main file:

- `contracts/loans/loanTypes/AssetOfferLoan.sol`

This contract sits on top of the shared base loan stack and adds:

- the borrower-facing `acceptOffer` entrypoint
- lender signature validation for asset-specific offers
- payoff calculation behavior
- offer-specific sanity checks

## What Makes It Distinct

The lender signs an offer for one exact collateral id. A borrower can only start the loan by accepting that offer with that exact NFT.

Compared with the base layer, `AssetOfferLoan` adds:

- one-time lender nonce invalidation at origination
- asset-specific signature verification
- current payoff calculation logic
- principal, maximum repayment, and origination-fee validation specific to accepted offers

## Public Entry Point

### `acceptOffer`

`acceptOffer(Offer, Signature)` is the borrower-facing origination function.

High-level flow:

1. resolve the wrapper for the collateral contract through the hub and permitted NFT registry
2. run generic loan sanity checks from `LoanBaseMinimal`
3. run asset-offer-specific sanity checks
4. build `LoanTerms`
5. validate and invalidate the lender nonce through `LoanCoordinator`
6. validate the lender signature
7. create the loan through the shared base flow
8. emit `LoanStarted`

## Signature And Nonce Behavior

### Offer type source

`AssetOfferLoan` does not hardcode its signature domain type locally. It resolves its own offer type dynamically from `LoanCoordinator` using:

- `getTypeOfLoanContract(address(this))`

That means signature validation depends on the coordinator's current registration of this contract.

### Nonce handling

For asset offers, origination is one-time per signed nonce:

- `checkAndInvalidateNonce` is called on `LoanCoordinator`
- once consumed, the lender nonce cannot be reused for the same offer type

This is the standard single-use offer model in the current protocol.

## Loan Term Construction

`_setupLoanTerms` fills in the runtime fields that do not live directly inside the signed `Offer`.

Notable fields populated at runtime:

- `nftCollateralWrapper`
- `loanStartTime`
- `loanAdminFeeInBasisPoints`
- `borrower`
- `lender`
- `escrow`

This is where the base loan model is concretized into a full active-loan record.

## Economics And Repayment Behavior

### Fixed vs pro-rata behavior

The contract comments still lean heavily on the older "fixed loan" framing, but the active implementation is broader:

- if `isProRata == false`, interest is effectively fixed at `maximumRepaymentAmount - principal`
- if `isProRata == true`, interest accrues linearly over time and is capped at that same maximum

So the current code path supports both fixed and pro-rata repayment behavior inside `AssetOfferLoan`.

### `getPayoffAmount`

`getPayoffAmount` reads the stored loan terms and computes:

- elapsed duration
- current interest due
- current total payoff

The borrower-facing payoff amount is:

- `principal + interestDue`

The admin fee is not added on top of that amount. It is carved out of the interest portion when repayment is distributed.

### `_payoffAndFee`

The internal distribution logic computes:

- `interestDue`
- `adminFee = computeAdminFee(interestDue, loanAdminFeeInBasisPoints)`
- `payoffAmount = principal + interestDue - adminFee`

At repayment time:

- lender receives `payoffAmount`
- protocol owner receives `adminFee`

## Sanity Checks

In addition to the shared base checks, `AssetOfferLoan` enforces:

- `maximumRepaymentAmount >= loanPrincipalAmount`
- `originationFee < loanPrincipalAmount`

Those map to:

- no negative-interest configurations
- borrower must actually receive some principal

## Dependencies

`AssetOfferLoan` depends directly on:

- `LoanBaseMinimal`
- `LoanCoordinator`
- `NFTfiSigningUtils`
- `LoanChecksAndCalculations`

And indirectly on hub-resolved components such as:

- permitted NFT registry
- escrow / personal escrow factory
- ERC20 transfer manager
- delegate plugin

## Important Behaviors To Preserve In Future Docs

### The signature is asset-specific

Unlike collection offers, the exact collateral id participates in the offer validation path.

### The lender nonce is consumed on acceptance

This is a single-use offer pattern, not a reusable standing order.

### The contract name can be misleading if read without the code

The implementation supports both fixed and pro-rata repayment behavior through `isProRata`, even though some top-level comments still describe the contract as if it were purely fixed-repayment.

## What To Read Next

The closest related page is:

- [Collection Offer Loan](./collection-offer-loan.md)

That page explains the reusable collection-offer variant and how its nonce and signature rules differ from `AssetOfferLoan`.
