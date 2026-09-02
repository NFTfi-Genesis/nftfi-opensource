# Deployment Scripts

This page is a compact inventory of the deploy scripts under `deploy/`.

## Main Deploy Scripts

| File | Tag | Purpose | Notes |
| --- | --- | --- | --- |
| `001_deploy_NftfiHub.ts` | `NftfiHub` | Deploys `ContractKeys`, `ContractKeyUtils`, and `NftfiHub` | Establishes the root registry layer |
| `002_deploy_nftWrappers.ts` | `Wrappers` | Deploys the NFT wrapper set | Reuses most wrappers on `mainnet` and on a legacy `goerli` branch |
| `003_deploy_Escrow.ts` | `Escrow` | Deploys `Escrow` | Links `ContractKeys` library |
| `004_deploy_PersonalEscrow.ts` | `PersonalEscrow` | Deploys `PersonalEscrow` and `PersonalEscrowFactory` | Factory gets the resolved owner address |
| `005_deploy_ERC20TransferManager.ts` | `ERC20TransferManager` | Deploys `ERC20TransferManager` | Uses owner plus hub address |
| `006_deploy_loanTypes.ts` | `LoanTypes` | Deploys the loan contracts and signing utilities | Reads permitted ERC20 config |
| `007_deploy_PermittedNFTs.ts` | `PermittedNFTs` | Deploys or reuses `PermittedNFTsAndTypeRegistry` and loads permit batches | Also binds NFT type strings to wrapper addresses |
| `008_deploy_DirectLoanCoordinator.ts` | `LoanCoordinator` | Deploys `LoanCoordinator`, `PromissoryNote`, and `ObligationReceipt` | Initializes note wiring if needed |
| `009_deploy_Refinancing.ts` | `Refinancing` | Deploys `Refinancing` and the initial adapter set | Uses network-specific flashloan and swap parameters |
| `010_deploy_DelegateCashPlugin.ts` | `DelegateCashPlugin` | Deploys `DelegateCashPlugin` | Uses the canonical delegate.cash contract address |
| `011_setup_contracts.ts` | `SetupContracts` | Writes deployed addresses into `NftfiHub` | Base networks skip active refi/plugin deployment |
| `012_setup_ownerships.ts` | `SetupOwnerships` | Requests ownership transfer to the final owner | Manual acceptance still required |
| `13_deploy_ArcadeRefiAdapter.ts` | `ArcadeRefinancingAdapter` | Deploys Arcade adapter and wires it into `Refinancing` if still owned by deployer | Intended as a targeted follow-up path |
| `015_redeploy_Refinancing.ts` | `RedeployRefinancing` | Redeploys `Refinancing` with a broader adapter set and rewires hub ownership if possible | Main targeted refi migration path |

## Config Inputs

The deploy scripts rely on:

- `deploy/config/permittedList.<network>.json`
- owner-resolution logic in `deploy/utils/owner-address.ts`
- log helpers in `deploy/utils/logs.ts`

## Main Tag Bundles Used By Package Scripts

The packaged deploy commands combine tags rather than manually invoking files one by one.

The main bundle is:

- `NftfiHub`
- `Wrappers`
- `Escrow`
- `PersonalEscrow`
- `ERC20TransferManager`
- `LoanTypes`
- `PermittedNFTs`
- `LoanCoordinator`
- optionally `Refinancing`
- optionally `DelegateCashPlugin`
- `SetupContracts`
- `SetupOwnerships`

## Practical Reading Order

If you only need to understand the deploy system quickly, read in this order:

1. `001_deploy_NftfiHub.ts`
2. `006_deploy_loanTypes.ts`
3. `007_deploy_PermittedNFTs.ts`
4. `008_deploy_DirectLoanCoordinator.ts`
5. `009_deploy_Refinancing.ts`
6. `011_setup_contracts.ts`
7. `012_setup_ownerships.ts`
