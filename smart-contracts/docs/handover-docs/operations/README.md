# Operations

This section documents how the protocol is deployed, wired, handed off, and maintained in practice.

The contracts remain the source of truth for behavior. These pages explain how the repo instantiates and operates those contracts.

## Coverage

- [Deployment Flow](./deployment-flow.md)
- [Deployment Scripts](./deployment-scripts.md)
- [Upgradeability And Redeploy Dependencies](./upgradeability-and-redeploy-dependencies.md)
- [Ownership Transfer And Safe Ops](./ownership-transfer-and-safe-ops.md)
- [Permit List Management](./permit-list-management.md)
- [Verification And Maintenance Scripts](./verification-and-maintenance-scripts.md)

## Main Commands

These are the main operational entrypoints currently exposed through `package.json`:

- `yarn deploy:mainnet`
- `yarn deploy:sepolia`
- `yarn deploy:base-sepolia`
- `yarn deploy:local`
- `yarn deploy:mainnet-redeploy-refi`
- `yarn deploy:local-redeploy-refi`
- `yarn deploy:virtual-mainnet-redeploy-refi`
- `yarn update-permit-list:mainnet`
- `yarn update-permit-list:sepolia`
- `yarn clone-permit-list:mainnet`
- `yarn clone-permit-list:sepolia`
- `yarn verify:mainnet`
- `yarn verify:sepolia`
- `yarn verify:virtual-mainnet`

## Most Important Operational Reality

The deploy flow is not just contract creation.

The important post-deploy steps are:

- setting the correct addresses in `NftfiHub`
- initializing `LoanCoordinator`
- loading NFT permit batches
- requesting ownership transfer to the real owner address
- manually accepting ownership on the destination Safe where required
