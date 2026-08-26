# Foreclosure Guide Generator

Generates a single Markdown document listing every **overdue, not-yet-foreclosed** NFTfi loan so
lenders can still claim their collateral on-chain after the dApp shuts down. It is the live,
all-versions successor to the legacy `docsv2.nftfi.com/foreclosures/foreclosures.html` page.

For each loan the guide includes the lender wallet, collateral (collection + asset name linked to
OpenSea via `opensea.io/item/ethereum/...`), Loan ID, and a **Foreclose** link that deep-links the
loan contract's _Write Contract_ tab straight to `liquidateOverdueLoan` (`#writeContract#F<n>`).
Loans are grouped by NFTfi contract version (V1, V2, V2 Collection, V2.1, V2.3, V2.3 Collection,
V3 Asset, V3 Collection) because each version is foreclosed on a different contract. The page
structure (Overview → How To Foreclose → List of Defaulted Loans) mirrors the legacy
`docsv2.nftfi.com/foreclosures/foreclosures.html` page, extended to cover every contract version and
to draw from live data.

## Data source

Reads the `market_loans` table (Postgres) — the same table populated by
[`market-loans-restorer`](../market-loans-restorer). Run the restorer first to (re)build loan state
from the event archive, then run this generator to render the guide. A loan is included when
`protocol = nftfi` and `status IN ('active', 'defaulted')` — i.e. still outstanding and neither
repaid nor already liquidated. Active loans that are not yet past their due date are listed too, so
the guide is a complete reference; foreclosing on-chain still only succeeds once a loan is overdue.

## Run

```bash
yarn nx serve foreclosure-guide-generator \
--args=\
"--db-uri=postgres://root:admin1234@localhost:5432/nftfi",\
"--out-file=./how-to-foreclose-defaulted-loans.md"
```

Arguments:

| Flag         | Description                                   |
| ------------ | --------------------------------------------- |
| `--db-uri`   | Postgres connection string for `market_loans` |
| `--out-file` | Path of the Markdown file to write            |

## Keeping versions in sync

Contract addresses live in [`src/constants.ts`](./src/constants.ts) and mirror
`market-loans-restorer/src/constants.ts`. When a new foreclosable loan contract ships, add it to
both. Any loan on an unrecognised contract is still emitted under an **Unmapped contracts** section
rather than silently dropped.
