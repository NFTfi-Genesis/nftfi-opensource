# Loan Origination

This subsection covers the contracts that define the shared loan model and the common machinery used by concrete loan types.

Coverage:

- [Base Loan Stack](./base-loan-stack.md)
- [Asset Offer Loan](./asset-offer-loan.md)
- [Collection Offer Loan](./collection-offer-loan.md)

## Scope

The goal here is to explain the common substrate below the concrete loan contracts.

That includes:

- loan data structures
- ownership and pause controls
- coordinator integration
- escrow selection and collateral handling
- ERC20 permit handling inside the loan contracts
- repayment, liquidation, and renegotiation scaffolding

Concrete accept-offer flows are documented in the `AssetOfferLoan` and `CollectionOfferLoan` pages.
