# Loan History Exporter

Generates a single CSV containing **every NFTfi loan ever created**, across all contract versions
and all statuses — the permanent historical record (Script 2 of the utility scripts), useful to
lenders and borrowers for tax filing or reconciling their activity. It is a one-shot script, not a
live service.

## Output

One row per loan, columns:

`loan_id, version, contract_address, lender, borrower, nft_contract, token_id, principal, currency,
apr, duration_days, prorated, repayment, interest, origination_fee, admin_fee, started_at,
maturity_at, status, repayment_date, foreclosure_date, started_tx, ended_tx`

- Every column is a **raw `market_loans` fact** — no derived valuations. Amounts (`principal`,
  `repayment`, `interest`, `origination_fee`, `admin_fee`) are raw wei; `currency` is the raw ERC-20
  contract address. USD/ETH valuations are intentionally **not** exported (those are NFTfi's
  price-feed valuations; users can look up historical rates themselves).
- `repayment` is the actual amount repaid and `interest` the actual interest — both meaningful for
  prorated loans, where they aren't derivable from `apr`/`duration_days`. `prorated` marks that term.
- `status` is the raw DB value: `active` / `repaid` / `defaulted` / `liquidated`.
- `repayment_date` and `foreclosure_date` both come from the loan's end timestamp, populated for
  `repaid` and `liquidated` loans respectively.
- `started_tx` is the origination tx hash; `ended_tx` is the repay/foreclosure tx hash — the keys a
  user needs to pull the exact on-chain figures themselves.
- Dates are ISO 8601; missing values are empty.

Rows are ordered by NFTfi contract **version** (V1 → V3 Collection, per `src/constants.ts`) and by
**loan id ascending** within each version.

### Caveat: renegotiated loans

`started_tx` / `ended_tx` model a loan as origination → close, which covers new loans, refinances,
repayments and foreclosures. **Renegotiation does not fit this model.** `NftfiLoanService.renegotiate`
mutates the `market_loans` row in place with the new terms and writes no transaction hash (none is
stored). So for a renegotiated loan the row holds only the **latest** terms, while `started_tx` still
points at the **original** origination — meaning `apr`, `duration_days`, `maturity_at`,
`repayment`/`interest` may not match what is visible at `started_tx` on Etherscan. Capturing
renegotiation history is out of scope for this one-shot exporter.

## Data source

Reads the `market_loans` table (Postgres). The export walks only the NFTfi loan contracts listed in
`src/constants.ts`, so it is inherently NFTfi-only — a contract address uniquely identifies its
protocol. Loans are read from the DB in batches per contract (no unbounded query), serialized a
batch at a time with [`json-2-csv`](https://www.npmjs.com/package/json-2-csv), and appended to the
file, so the full history is never held in memory at once.

## Run

```bash
yarn nx serve loan-history-exporter \
--args=\
"--db-uri=postgres://user:pass@host/nftfi",\
"--out-file=./tmp/loan-history.csv"
```

| Flag         | Description                                   |
| ------------ | --------------------------------------------- |
| `--db-uri`   | Postgres connection string for `market_loans` |
| `--out-file` | Absolute path of the CSV file to write        |

The run is read-only (the only write is the output CSV).

## Keeping versions in sync

Contract addresses in [`src/constants.ts`](./src/constants.ts) mirror
`market-loans-restorer/src/constants.ts` and the foreclosure guide generator's registry. When a new
loan contract ships, add it here too.
