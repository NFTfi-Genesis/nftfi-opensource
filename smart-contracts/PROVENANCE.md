# Mainnet provenance

- Protocol: NFTfi V3
- Network: Ethereum mainnet
- Chain ID: `1`
- Snapshot date: 2026-08-31
- License: MIT
- forge-std: `5dd1c68131ddd3c89ef169666eb262b92e90507c`

## Evidence

- `deployments/mainnet/*.json`: addresses, ABIs, bytecode, receipts, libraries, and storage layouts
- `deployments/mainnet/solcInputs/`: exact compiler inputs
- `mainnet-contract-manifest.json`: contract inventory
- `scripts/verifyMainnetState.ts`: read-only on-chain verification

Use the compiler input referenced by each deployment artifact for byte-for-byte analysis.

## Verify

```bash
MAINNET_RPC_URL=https://... yarn verify:mainnet-state
```

The verifier checks deployment receipts, contract addresses, runtime code, creation bytecode, protocol wiring,
Refinancing, and all registered adapters.
