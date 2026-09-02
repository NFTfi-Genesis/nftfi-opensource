# Permit List Management

This page covers how permitted ERC20s and permitted NFT collateral are sourced and maintained.

## Config Files

Permit-list inputs live under `deploy/config/` as `permittedList.<network>.json`.

Those files feed two different parts of deployment:

- `006_deploy_loanTypes.ts` reads `permittedLists.ERC20` and passes it into the loan contract constructors
- `007_deploy_PermittedNFTs.ts` reads `permittedLists.NFT` and seeds the NFT permit registry

## NFT Permit File Shape

The NFT section is split into:

- `deploymentBatch`
- `postDeploymentBatches`

That split is operational rather than conceptual:

- the first batch is loaded via constructor/deploy path
- later batches are applied after deployment through `setNFTPermits`

## Deployment Behavior

`007_deploy_PermittedNFTs.ts`:

- collects wrapper addresses for each supported NFT type
- deploys `PermittedNFTsAndTypeRegistry` when needed
- loads the initial batch during deployment
- iterates the post-deployment batches and writes them on-chain if not already present

The script also special-cases the mainnet and legacy goerli reuse path:

- if an existing `PermittedNFTsAndTypeRegistry` deployment is available on those networks, it is reused

## `updatePermittedNfts.ts`

This script refreshes permit-list JSON from a configured project-metadata endpoint.

Important behavior:

- allowed networks are `mainnet`, `goerli`, and `sepolia`
- `PERMITTED_NFTS_API_URL` must contain the endpoint URL
- `API_USER_AGENT` optionally sets the request user agent
- only whitelisted projects with `ERC721`, `ERC1155`, or `PUNKS` schemas are included
- CryptoKitties gets mapped to the `CryptoKitties` type through a hardcoded address check
- `BATCH_SIZE` is currently `4`, so the script intentionally emits many small post-deployment batches

`goerli` is a legacy branch retained for compatibility, not an active deployment target.

This script rewrites the config JSON. It does not directly update the on-chain registry.

## `clonePermitList.ts`

This script rebuilds a permit-list config from the currently deployed on-chain registry.

It:

- queries `NFTPermit` events from `PermittedNFTsAndTypeRegistry`
- re-reads current permit values for those NFT contracts
- drops zeroed permits
- converts the stored bytes32 type values back into strings
- rewrites the local config JSON

The batch size used here is much larger than the API-update script:

- `BATCH_SIZE = 250`

So this script is better suited for cloning the current live state into a deployment config snapshot.

## Practical Guidance

- review the generated JSON before using it in deployment
- treat the config files as operational inputs, not as the source of truth for active on-chain state
- if the config and the live registry disagree, verify the contract state and events
- remember that ERC20 allowlists and NFT allowlists are consumed by different deployment steps
