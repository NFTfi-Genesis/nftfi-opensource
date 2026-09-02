# Repo Map

This page points at the folders that matter when working on or operating the protocol.

## Primary Sources

| Path | Why it matters |
| --- | --- |
| `contracts/` | Source of truth for protocol behavior. Start here first. |
| `deploy/` | Hardhat deploy scripts, deploy tags, setup ordering, and permit-list config. |
| `deployments/mainnet/` | Mainnet deployment artifacts, compiler inputs, and deployed addresses. |
| `test/` | Hardhat, fork, and utility test coverage for the active system. |
| `scripts/` | Operational helpers such as verification and permit-list maintenance. |
| `docs/handover-docs/` | Developer documentation for the active codebase. |

## Contract Layout

| Path | Contents |
| --- | --- |
| `contracts/NftfiHub.sol` | Registry root used by other contracts for address discovery. |
| `contracts/utils/` | Contract key constants and lookup helpers. |
| `contracts/loans/` | Shared loan logic and concrete origination contracts. |
| `contracts/smartNft/` | SmartNFT note implementation for lender and borrower positions. |
| `contracts/escrow/` | Global escrow, personal escrow, and custody plugins. |
| `contracts/permittedLists/` | Permit-list registry for supported collateral types. |
| `contracts/nftTypeRegistry/` | Wrapper contracts that normalize non-standard NFT collections. |
| `contracts/refinancing/` | Refinance core, flashloan support, and adapter registry/adapters. |
| `contracts/interfaces/` | Interfaces used across the protocol surface. |

## Deployment Layout

| Path | Contents |
| --- | --- |
| `deploy/001_deploy_NftfiHub.ts` through `deploy/012_setup_ownerships.ts` | Main deployment sequence for the active protocol. |
| `deploy/015_redeploy_Refinancing.ts` | Targeted refinance redeploy path. |
| `deploy/13_deploy_ArcadeRefiAdapter.ts` | Adapter-specific deployment step. |
| `deploy/config/` | Permit-list JSON inputs by network. |
| `deploy/testContracts/` | Test-only deploy helpers for local and testnet work. |

## Test Layout

| Path | Contents |
| --- | --- |
| `test/` | Main Hardhat test tree. |
| `test/forkTest/` | Mainnet-fork tests, including refinance integrations. |
| `test/utils/` | Shared fixtures, helpers, and test utilities. |

## Config And Tooling

| Path | Contents |
| --- | --- |
| `package.json` | Yarn scripts, dev tooling, linting, deployment commands, and verification commands. |
| `hardhat.config.ts` | Network definitions, fork config, plugins, deploy integration, verification, and Tenderly wiring. |
| `foundry.toml` | Foundry configuration for the forge side of the repo. |
| `.env` and related env inputs | Network keys, RPC providers, Etherscan key, Tenderly settings, and gas config. |

## Recommended Workflow

When investigating a protocol behavior:

1. start in `contracts/`
2. check `deploy/` to see how the contract is wired into the live system
3. check `deployments/mainnet/` for the published Mainnet address data
4. check `test/` for exercised scenarios and regression coverage
