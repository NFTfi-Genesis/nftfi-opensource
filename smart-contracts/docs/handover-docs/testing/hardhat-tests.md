# Hardhat Tests

The TypeScript Hardhat suite is the main behavioral test surface in this repo.

## Most Important Suites

### Loan lifecycle

The largest and most important core-loan suites are:

- `test/fixed-offer-type-loan.ts`
- `test/fixed-collection-offer-type-loan.ts`
- `test/integrated-proRated-offer-type-loan.ts`
- `test/personal-escrow-fixed-offer-type-loan.ts`
- `test/renegotiation-test.ts`

These cover:

- offer acceptance
- permit checks
- lender nonces and cancellation
- signature expiry and invalid signatures
- repayment and liquidation
- payoff calculations
- admin fee and maximum-duration controls
- personal escrow paths

If someone changes core loan logic, these are the first suites to revisit.

### Refinance behavior

The main local refinance suite is:

- `test/refinancing-test.ts`

It validates refinance transitions using repo-deployed local contracts and mock flashloan support. It is the best entrypoint for understanding how the refinance surface is expected to behave before looking at fork integrations.

### Notes and coordination

The highest-signal note/coordinator suites are:

- `test/loanCoordinator.unit.ts`
- `test/smartNft.unit.ts`

They cover:

- loan registration and resolution
- promissory note and obligation receipt minting/burning
- note-to-loan mapping
- role restrictions and metadata/base-URI controls

### Permissions and deployment assumptions

The most useful operational Hardhat suite is:

- `test/deployment-ownership-transfer-test.ts`

It checks that the intended owner has control after setup and that the deployer no longer retains owner-only powers.

That makes it especially relevant for production deployment changes.

### Wrappers and collateral types

Important collateral-format coverage includes:

- `test/cryptoKitties-wrapper.ts`
- `test/erc1155-wrapper.ts`
- `test/legacyERC721-wrapper.ts`
- `test/punk-wrapper.ts`
- `test/invalid-nft-test.ts`

These tests matter because wrapper and permit mistakes often show up as broken custody transitions rather than obvious logic errors.

### Lower-level unit tests

There is also a broad set of smaller unit tests such as:

- `test/baseLoan.unit.ts`
- `test/nftfiHub.unit.ts`
- `test/nftTypeRegistry.unit.ts`
- `test/permittedNFTs.unit.ts`
- `test/permittedERC20s.unit.ts`
- `test/permittedERC20sInLoanBase.unit.ts`
- `test/signingUtils.unit.ts`
- `test/ownable.unit.ts`

These are good for targeted regressions when changing one subsystem in isolation.

## Test Style

The Hardhat suite is mostly integration-heavy rather than purely mock-driven.

The common pattern is:

- deploy the stack through shared fixtures
- mint test ERC20/NFT assets
- approve escrow or transfer-manager contracts
- drive a real loan/refinance path
- assert ownership, balances, and emitted events

That is why the suite is high-signal for protocol development even when individual files are long.
