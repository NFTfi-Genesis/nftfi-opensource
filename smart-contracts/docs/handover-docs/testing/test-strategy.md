# Test Strategy

The repo uses a mixed Hardhat and Foundry test setup.

The practical split is:

- Hardhat TypeScript tests cover most protocol behavior, integration flows, permissions, wrapper handling, and refinance behavior
- Hardhat fork tests exercise live-protocol and live-asset assumptions against mainnet-fork state
- Foundry tests provide a smaller Solidity-native layer for core contract behavior and fixture-based local testing

## What Matters Most

If you only read a few tests, the highest-signal areas are:

- loan origination and repayment in `test/fixed-offer-type-loan.ts`
- collection offers in `test/fixed-collection-offer-type-loan.ts`
- refinancing in `test/refinancing-test.ts`
- forked refinancing integrations in `test/forkTest/*.ts`
- deployment ownership assumptions in `test/deployment-ownership-transfer-test.ts`
- `LoanCoordinator` and `SmartNft` unit coverage in `test/loanCoordinator.unit.ts` and `test/smartNft.unit.ts`

## Main Behavioral Themes

Across the suite, the tests repeatedly validate:

- offer signature and nonce rules
- allowlist gating for ERC20s and NFTs
- custody behavior through escrow and wrappers
- note minting and burning through `LoanCoordinator`
- repayment, liquidation, and refinance state transitions
- owner-only admin controls
- operational invariants after deployment and ownership transfer

## What This Section Does Not Try To Do

This documentation does not catalog every single test case.

The goal is to point developers at the suites that explain the protocol model and catch risky changes.
