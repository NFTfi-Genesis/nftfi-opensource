# Toolchain

The repo uses a mixed Ethereum development stack.

## Core Components

### Hardhat

Hardhat is the main orchestration layer for:

- compilation
- TypeScript tests
- deployment
- verification
- network configuration
- mainnet forking

Important plugins in `hardhat.config.ts` include:

- `hardhat-deploy`
- `hardhat-deploy-ethers`
- `@nomicfoundation/hardhat-verify`
- `@nomicfoundation/hardhat-foundry`
- `@tenderly/hardhat-tenderly`
- `hardhat-gas-reporter`
- `hardhat-contract-sizer`
- `solidity-coverage`

### Foundry

Foundry is integrated rather than replacing Hardhat.

It is used for:

- Forge tests
- Solidity-native fixtures
- Foundry formatting and config support

### TypeChain

TypeChain is configured with `ethers-v6` target output into `typechain/`, which is why the TypeScript tests and deploy scripts can rely on typed contract bindings.

### Verification Backends

The repo supports two verification modes:

- Etherscan-style verification for standard networks
- Tenderly plugin verification for `virtual-mainnet`

## Non-Obvious Tooling Detail

`hardhat.config.ts` includes an ethers v5 provider formatter patch to normalize empty-string `to` fields on contract-creation transactions.

That patch exists to avoid `INVALID_ARGUMENT` failures in mixed tooling paths.

It is operationally important because it is easy to miss if someone assumes the config is purely declarative.
