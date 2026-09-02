# Deployment Flow

This page describes the deploy sequence implemented under `deploy/`.

## Standard Sequence

The main deploy order is:

1. `001_deploy_NftfiHub.ts`
2. `002_deploy_nftWrappers.ts`
3. `003_deploy_Escrow.ts`
4. `004_deploy_PersonalEscrow.ts`
5. `005_deploy_ERC20TransferManager.ts`
6. `006_deploy_loanTypes.ts`
7. `007_deploy_PermittedNFTs.ts`
8. `008_deploy_DirectLoanCoordinator.ts`
9. `009_deploy_Refinancing.ts`
10. `010_deploy_DelegateCashPlugin.ts`
11. `011_setup_contracts.ts`
12. `012_setup_ownerships.ts`

That sequence matters because later steps assume earlier contracts already exist and can be queried by name through Hardhat Deploy.

## What Each Stage Does

### 1. Hub bootstrap

`001_deploy_NftfiHub.ts` deploys:

- `ContractKeys`
- `ContractKeyUtils`
- `NftfiHub`

`NftfiHub` is initially deployed with the deployer as admin and with an empty key/address list.

### 2. NFT wrappers

`002_deploy_nftWrappers.ts` deploys the wrapper layer used by the permit registry.

Notable behavior:

- on `mainnet` and `goerli`, most wrappers are reused instead of redeployed
- `SuperRareV1Wrapper` is still deployed in this step

The `goerli` branch is retained legacy script logic, not an active deployment target.

### 3. Custody layer

`003_deploy_Escrow.ts`, `004_deploy_PersonalEscrow.ts`, and `005_deploy_ERC20TransferManager.ts` deploy the collateral and ERC20 movement layer:

- `Escrow`
- `PersonalEscrow`
- `PersonalEscrowFactory`
- `ERC20TransferManager`

These constructors already depend on the hub and owner-address resolution.

### 4. Loan contracts

`006_deploy_loanTypes.ts` deploys:

- `NFTfiSigningUtils`
- `LoanChecksAndCalculations`
- `AssetOfferLoan`
- `CollectionOfferLoan`
- `NFTfiSigningUtilsContract`
- `NFTfiCollectionOfferSigningUtilsContract`

This step reads `deploy/config/permittedList.<network>.json` and passes the configured permitted ERC20 list into the two loan contracts.

### 5. NFT permit registry

`007_deploy_PermittedNFTs.ts` deploys or reuses `PermittedNFTsAndTypeRegistry`.

It also:

- binds NFT type strings to wrapper addresses
- seeds an initial deployment batch of NFT permits
- applies additional post-deployment batches

On `mainnet` and `goerli`, the script prefers reusing an existing registry if one is already deployed.

Again, the `goerli` branch is a legacy path that still exists in the deployment code.

### 6. Note system wiring

`008_deploy_DirectLoanCoordinator.ts` deploys:

- `LoanCoordinator`
- `PromissoryNote`
- `ObligationReceipt`

Then it initializes `LoanCoordinator` with the two SmartNFT addresses if that initialization has not already been done.

### 7. Refinancing layer

`009_deploy_Refinancing.ts` deploys the native and legacy NFTfi refinancing adapters plus `Refinancing`.

Important network-specific behavior:

- `mainnet` uses real dYdX and Uniswap constructor parameters
- `sepolia` and `goerli` deploy `MockDyDxFlashloan`
- other environments use zero-address or mock swap parameters
- `base-mainnet` and `base-sepolia` do not run this stage in the packaged deploy commands

The `goerli` branch here is legacy support still present in the script, not a current primary deployment flow.

### 8. Delegate cash plugin

`010_deploy_DelegateCashPlugin.ts` deploys `DelegateCashPlugin` against the canonical delegate.cash registry address.

### 9. Hub wiring

`011_setup_contracts.ts` writes the current system addresses into `NftfiHub`.

The hub keys set here include:

- delegate plugin
- permitted NFTs
- permitted ERC20s
- loan coordinator
- refinancing
- escrow
- personal escrow factory
- ERC20 transfer manager

For Base networks, refinancing and delegate plugin are skipped and zero addresses are written for those keys.

### 10. Ownership handoff

`012_setup_ownerships.ts` requests ownership transfer for the main ownable contracts to the configured owner address.

This is only a request step. The destination owner still needs to accept ownership manually.

## Network Variants

### Mainnet and Sepolia

The packaged deploy commands include the full flow:

- hub
- wrappers
- escrow
- personal escrow
- ERC20 transfer manager
- loan types
- permitted NFTs
- loan coordinator
- refinancing
- delegate cash plugin
- hub setup
- ownership setup

### Base Sepolia

`yarn deploy:base-sepolia` stops before refinancing and delegate cash plugin.

That is consistent with the setup script comments stating that refinance is not deployed to Base because the current refinance flow depends on DEX/flashloan support.

### Localhost

`yarn deploy:local` runs the same broad flow as Ethereum test deployments and is the easiest environment for exercising the full repo-owned stack.

### Virtual Mainnet

The normal packaged path focuses on targeted redeploys such as adapter or refinancing work rather than a single broad top-level deploy command.

## Redeploy Paths

Two important non-standard deploy paths exist:

- `015_redeploy_Refinancing.ts`
- `13_deploy_ArcadeRefiAdapter.ts`

`015_redeploy_Refinancing.ts` is the more current targeted redeploy path. It adds the broader adapter set:

- NFTfi native
- NFTfi legacy v2.1
- NFTfi legacy v2.3
- Arcade
- Blend
- Gondi

It also tries to update the `NftfiHub` refinancing entry and request ownership transfer for the new `Refinancing` deployment.

## Operational Prerequisites

Before running deploys, the repo expects:

- correct RPC and private-key env vars
- correct owner address env vars
- a reviewed permit-list JSON for the target network
- a funded deployer account
- Etherscan or Tenderly config if verification is part of the run

## Main Risks

- deploying contracts without following with `011_setup_contracts.ts` leaves `NftfiHub` inconsistent
- deploying `LoanCoordinator` without initialization leaves notes unwired
- forgetting the Safe ownership acceptance step leaves admin control on the deployer
- Base deployment assumptions differ from Ethereum because the packaged flow omits refinancing
