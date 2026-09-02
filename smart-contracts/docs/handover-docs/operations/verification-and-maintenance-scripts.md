# Verification And Maintenance Scripts

This page covers the operational helper scripts under `scripts/`.

## Verification Scripts

### `verifyContracts.ts`

This is the main Etherscan-style verification script for a full deployment.

It:

- reads deployment artifacts from `deployments/<network>/`
- verifies the broad contract set one contract at a time
- uses explicit contract-path overrides for some adapters and utility contracts

The script itself warns that verification may need multiple runs and that previously successful steps may need to be commented out on retry.

### `verifyContractsMockDyDx.ts`

This verifies only `MockDyDxFlashloan` from the current network deployment folder.

### `verifyContractsTestnetPunks.ts`

This verifies only `TestnetPunks` from the current network deployment folder.

### `verifyContractsTenderly.ts`

This is the virtual-mainnet verification path.

Important behavior:

- it exits unless the network is `virtual-mainnet`
- it uses the Tenderly plugin rather than Etherscan verification
- it retries transient failures such as internal server errors and network issues
- it focuses on the refinancing contract and adapter set

## Permit And Registry Maintenance

### `updatePermittedNfts.ts`

Refreshes local permit-list config from the project-metadata endpoint configured through `PERMITTED_NFTS_API_URL`.

### `clonePermitList.ts`

Reconstructs local permit-list config from the deployed registry state.

## Administrative Helpers

### `disableV1.ts`

This script disables the configured V1 contract by calling:

- `updateMaximumNumberOfActiveLoans(0)`

It expects:

- `v1Admin` to be configured as the secondary named account
- `<NETWORK>_V1_ADDRESS` to be present in env

### `incrementNonce.ts`

This is a deployer-side nonce-management helper using `NonceManager`.

It is operationally small, but it exists because deployment work sometimes needs manual nonce intervention.

## Manual Test Helpers

There are also ad hoc virtual-mainnet refinance scripts:

- `vnetGondiRefiManualTest.ts`
- `vnetNftfiRefiManualTest.ts`

These are better treated as operator test helpers than as formal verification or deployment steps.
