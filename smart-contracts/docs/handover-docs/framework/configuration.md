# Configuration

This page summarizes the most important config behavior from `hardhat.config.ts` and `foundry.toml`.

## Hardhat Config

### Default network

The default network is `hardhat`.

### Mainnet fork

The `hardhat` network is configured to fork Ethereum mainnet using Alchemy at:

- block `21037753`

That is the baseline for fork tests and any local Hardhat work that depends on live mainnet state.

### Named accounts

Two named accounts are configured:

- `deployer = 0`
- `v1Admin = 1`

This matters for deploy scripts and for admin helpers such as `disableV1.ts`.

### Network set

The main configured networks are:

- `localhost`
- `hardhat`
- `mainnet`
- `sepolia`
- `base-sepolia`
- `base-mainnet`
- `virtual-mainnet`

The mainnet-like networks use Infura if `INFURA_API_KEY` is set, otherwise they fall back to Alchemy.

### Compiler settings

Hardhat Solidity settings:

- Solidity `0.8.19`
- optimizer enabled
- optimizer runs `900`
- metadata bytecode hash disabled

That differs from Foundry’s default profile, which uses optimizer runs `200`.

## Foundry Config

Foundry is configured to mirror the repo layout:

- `src = "contracts"`
- `test = "test"`
- `out = "artifacts"`

Important Foundry settings include:

- `evm_version = "paris"`
- optimizer enabled
- `optimizer_runs = 200`
- remappings for `contracts`, `node_modules`, `lib`, and Hardhat packages

## Cross-Tooling Implication

This repo intentionally shares source and test directories across Hardhat and Foundry rather than separating them into different trees.

That is convenient, but it means build output assumptions and compiler-tuning assumptions should be checked carefully when a change touches both toolchains.
