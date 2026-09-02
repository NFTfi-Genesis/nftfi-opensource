# Ownership Transfer And Safe Ops

This page covers how ownership is assigned during deployment and where manual Safe work is still required.

## Owner Address Resolution

The deploy scripts use `deploy/utils/owner-address.ts`.

Behavior:

- on `mainnet`, `ETH-MAINNET_OWNER_ADDRESS` must be set or deployment throws
- on other networks, the script uses `<NETWORK>_OWNER_ADDRESS` if present
- if that env var is absent on non-mainnet networks, the deployer address is used

That means mainnet ownership is intentionally stricter than the other environments.

## Contracts Handed Off By `012_setup_ownerships.ts`

The ownership handoff script requests transfer for:

- `NftfiHub`
- `PermittedNFTsAndTypeRegistry`
- `AssetOfferLoan`
- `CollectionOfferLoan`
- `LoanCoordinator`
- `Refinancing` when that contract exists for the current network
- `Escrow`
- `ERC20TransferManager`

This is a request step, not the final acceptance step.

## Safe Acceptance Requirement

The script output explicitly warns that ownership still has to be manually accepted on the destination Gnosis Safe.

Operationally, that means a deploy is not complete just because `012_setup_ownerships.ts` succeeded.

The final owner must accept the transfer on each contract.

## Redeploy-Specific Behavior

`015_redeploy_Refinancing.ts` has similar ownership behavior for a new `Refinancing` deployment:

- if deployer still owns the contract, the script can set the hub entry and request ownership transfer
- if deployer no longer owns it, hub setup and follow-on admin work must be done manually

`13_deploy_ArcadeRefiAdapter.ts` follows the same principle:

- if deployer still owns `Refinancing`, the script can register the adapter directly
- otherwise the adapter setup must be done manually by the current owner

## Operational Checklist

After a deployment or targeted redeploy:

1. confirm the intended owner address is correct
2. confirm the ownership-transfer request tx succeeded
3. accept ownership from the destination Safe
4. verify `owner()` on the key contracts
5. verify `NftfiHub` points at the intended contract addresses

## Main Gotchas

- forgetting the Safe acceptance step leaves the deployer with control
- a wrong owner env var can hand control to the wrong address
- targeted adapter or refinancing scripts become partially manual once deployer is no longer owner
- Base networks intentionally omit some owner-managed components because the packaged flow omits refinance deployment
