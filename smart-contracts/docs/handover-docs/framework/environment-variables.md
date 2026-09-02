# Environment Variables

This page summarizes the environment inputs that matter most.

It is based primarily on `hardhat.config.ts`, deploy utilities, and secondarily on `.env.example`.

## RPC And Provider Configuration

- `INFURA_API_KEY`
- `ALCHEMY_API_KEY`
- `GAS_PRICE`

The Hardhat config prefers Infura when `INFURA_API_KEY` is present and otherwise builds RPC URLs from `ALCHEMY_API_KEY`.

## Verification And Tenderly

- `ETHERSCAN_KEY`
- `TENDERLY_NETWORK_SLUG`
- `TENDERLY_ACCESS_TOKEN`
- `TENDERLY_AUTOMATIC_VERIFICATION`

`TENDERLY_AUTOMATIC_VERIFICATION` is also toggled by `hardhat.config.ts` depending on whether the active network is `virtual-mainnet`.

## Per-Network Deployer Keys

The config expects network-name-based private keys such as:

- `ETH-MAINNET_PRIVATE_KEY`
- `ETH-SEPOLIA_PRIVATE_KEY`
- `BASE-SEPOLIA_PRIVATE_KEY`
- `VIRTUAL-MAINNET_PRIVATE_KEY`

The exact env-var prefixing comes from the network keys in `hardhat.config.ts`.

## Owner And Admin Addresses

Important owner/admin env vars include:

- `ETH-MAINNET_OWNER_ADDRESS`
- `SEPOLIA_OWNER_ADDRESS`
- `BASE-SEPOLIA_OWNER_ADDRESS`
- `VIRTUAL-MAINNET_OWNER_ADDRESS`
- `<NETWORK>_V1_PRIVATE_KEY`
- `<NETWORK>_V1_ADDRESS`

Mainnet is stricter than the other networks:

- `getOwnerAddress()` throws if `ETH-MAINNET_OWNER_ADDRESS` is missing

## Permit-List API Input

- `PERMITTED_NFTS_API_URL`
- `API_USER_AGENT`

`PERMITTED_NFTS_API_URL` is required by `scripts/updatePermittedNfts.ts`. It identifies the project-metadata endpoint used to refresh permit-list config. `API_USER_AGENT` is optional.

## Practical Advice

- treat `hardhat.config.ts` and deploy utilities as the real source of truth for env naming
- use `.env.example` only as a partial starting point
- do not copy `.env.example` blindly, because some key naming there lags the current config conventions
- keep network owner addresses and deployer keys distinct in production
- verify env-var naming carefully because this repo mixes prefixes like `ETH-MAINNET_*` and plain `SEPOLIA_*`
