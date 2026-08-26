# Token Unstaking Guide Generator

Generates a GitHub-ready **unstaking lookup document** for users with locked NFTFI tokens, built fresh
from Ethereum mainnet at a single pinned block on every run. It does not rely on NFTfi frontends,
Foundation dashboards, or any previous export.

A user opens the document, searches for their wallet, and each row tells them exactly which Etherscan
_Write Contract_ page to open, which function to call, and which values to enter to receive their NFTFI
back.

## Output

The generator writes **two** files, each to its own explicit path:

| Flag                | Audience  | Published? | Contents                                                                                  |
| ------------------- | --------- | ---------- | ----------------------------------------------------------------------------------------- |
| `--public-out-file` | Users     | Yes        | Jargon-free lookup table: wallet, amount, Etherscan link, function, `name = value` params |
| `--review-out-file` | NFTfi dev | No         | Errors (block publishing), flags (informational), run summary, reconciliation results     |

The public file is written **only when the developer report has zero errors and every reconciliation
check passes** (the Publish Gate). Otherwise the run exits non-zero and writes only the developer report.

## Contracts in scope

Read live from mainnet (addresses, ABIs, and deploy blocks mirror the verified `eth.token`
`deployments/mainnet` artifacts, branch `dev`):

| Contract               | Address                                      | Function called      |
| ---------------------- | -------------------------------------------- | -------------------- |
| `TokenLock` (current)  | `0x8a63B7D2B66FB054705731Cc7964b05e7Ad095cF` | `withdrawNoCooldown` |
| `DistributorTokenLock` | `0xe53FfaCaDbc4744bE405BAD4AbE9852348eBeC02` | `withdraw`           |

`ExternalTokenLock` (`0x55c1…b1F7`) is out of scope while empty; the run confirms its balance is still
0 as a preflight invariant.

## How it works

1. **Preflight invariants** — read once at the pinned block (`paused`, `cooldown`,
   `protocolSignerAddress`, `ExternalTokenLock` balance, current-lock `WithdrawalRequested` count). Any
   mismatch **aborts the run and escalates** rather than degrading rows.
2. **Discovery** — reconstruct candidate wallets and legacy request tuples from event logs
   (`Locked`, `WithdrawalRequested`).
3. **Verification** — confirm balances/requests against live contract state (direct block-pinned
   `eth_call` reads, bounded concurrency), recomputing each legacy
   `requestHash = keccak256(abi.encodePacked(amount, wallet, timestamp))`.
4. **Simulation Gate** — `eth_call` each row's exact transaction with `from = wallet` at the pinned
   block. Success → public row; revert → developer-report error with the decoded revert string.
5. **Reconciliation** — every locked token must land in a row or an error; aggregate and per-wallet
   sums must tie out to each lock's NFTFI balance.
6. **Publish Gate** — see Output above.

## Run

```bash
yarn nx serve token-unstaking-guide-generator \
--args=\
"--rpc-url=https://eth-mainnet.g.alchemy.com/v2/<key>",\
"--public-out-file=./howto-unstake-nftfi-tokens.md",\
"--review-out-file=./unstake-manual-review.md",\
"--block=25345421"
```

| Flag                | Required | Description                                               |
| ------------------- | -------- | --------------------------------------------------------- |
| `--rpc-url`         | yes      | Mainnet JSON-RPC endpoint. **Never written into output.** |
| `--public-out-file` | yes      | Path of the public, user-facing lookup document to write  |
| `--review-out-file` | yes      | Path of the internal developer review report to write     |
| `--block`           | no       | Generation block to pin every read to (default: latest)   |

The review report is always written; the public file is written only when the Publish Gate passes (zero
errors and all reconciliation checks pass).

## Keeping in sync

Contract addresses, deploy blocks, and ABIs live in [`src/constants.ts`](./src/constants.ts) and
[`src/abis/`](./src/abis). If a lock is ever redeployed, refresh both from the `eth.token` deployment
artifacts.
