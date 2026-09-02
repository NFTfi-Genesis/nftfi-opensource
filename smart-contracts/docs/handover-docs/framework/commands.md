# Commands

This page summarizes the most useful commands from `package.json`.

## Build And Compile

- `yarn compile`
- `yarn build`
- `yarn clean`

## Tests

- `yarn test`
- `yarn test:hardhat`
- `yarn test:foundry`
- `yarn coverage`
- `yarn gas-report`

## Lint And Formatting

- `yarn lint`
- `yarn lint:sol`
- `yarn lint:ts`
- `yarn prettier`
- `yarn prettier:sol`
- `yarn prettier:ts`

## Deployment

- `yarn deploy:mainnet`
- `yarn deploy:mainnet-no-permit-list-update`
- `yarn deploy:mainnet-hub`
- `yarn deploy:mainnet-redeploy-refi`
- `yarn deploy:mainnet-arcade-refi`
- `yarn deploy:sepolia`
- `yarn deploy:sepolia-no-permit-list-update`
- `yarn deploy:base-sepolia`
- `yarn deploy:local`
- `yarn deploy:local-hub`
- `yarn deploy:local-redeploy-refi`
- `yarn deploy:local-arcade-refi`
- `yarn deploy:virtual-mainnet-redeploy-refi`
- `yarn deploy:virtual-mainnet-arcade-refi`
- `yarn local-network`
- `yarn reset-local-deployments`

## Permit List And Verification

- `yarn update-permit-list:mainnet`
- `yarn update-permit-list:sepolia`
- `yarn clone-permit-list:mainnet`
- `yarn clone-permit-list:sepolia`
- `yarn verify:mainnet`
- `yarn verify:sepolia`
- `yarn verify:sepolia-mock-dydx`
- `yarn verify-testnet-punks:sepolia`
- `yarn verify:virtual-mainnet`

## Security And Size

- `yarn size`
- `yarn slither`
- `yarn slither:full`
- `yarn slither:report`

## Documentation

- `yarn doc:uml`
- `yarn docify`
- `yarn docgen`

## Most Important Working Set

For most day-to-day work, the commands that matter most are:

- `yarn compile`
- `yarn test:hardhat`
- `yarn test:foundry`
- `yarn deploy:local`
- `yarn deploy:mainnet`
- `yarn verify:mainnet`
