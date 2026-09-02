# Fixtures And Test Utilities

The test helpers under `test/utils/` are the main reason the suite stays usable despite its size.

## Most Important Helper Files

### `test/utils/deploy-contracts.ts`

This is the most important shared test helper.

It:

- runs Hardhat Deploy fixtures for the protocol stack
- rewrites the owner env var for the current network inside the test process
- accepts ownership where the deploy scripts only requested transfer
- deploys local test tokens and NFTs
- updates local permit lists for those test assets
- loads mock flashloan markets
- returns a typed bundle of the key contracts

If someone needs to understand how most TypeScript tests get their world state, this is the file to read first.

### `test/utils/fixtures.ts`

This file defines:

- named account roles used throughout the suite
- baseline loan data
- canonical fixed-loan and prorated-loan fixtures

It is the main source for the recurring borrower/lender/admin actor model used in the tests.

### `test/utils/utils.ts`

This is the shared low-level helper layer.

It includes:

- time travel helpers
- snapshot and revert helpers
- event-selection helpers
- ownership and balance assertions
- signature builders
- contract-key constants mirrored for test usage

This file is central to understanding how the tests express signatures, time-dependent flows, and post-transaction assertions.

### `test/utils/tokens.ts`

This file handles repetitive asset setup such as minting, approvals, and special NFT-format preparation.

It is especially useful when reading wrapper or escrow tests.

## Why These Helpers Matter

Most of the Hardhat tests are large because they drive real protocol flows.

The fixture layer is what keeps that manageable:

- one common deployment path
- one common account model
- one common set of signature and time helpers

When adding or debugging tests, start with the helpers before duplicating setup logic inside a test file.
