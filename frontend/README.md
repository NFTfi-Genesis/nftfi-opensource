# NFTfi Frontend (dApp)

> ⚠️ **Archived / unmaintained.** This is a point-in-time snapshot (release **`v3.3.0`**) of the NFTfi web frontend, open-sourced as the NFTfi project winds down. It is provided **as-is, with no support, maintenance, warranties, or guarantees**. NFTfi's hosted backend, APIs, and infrastructure are being decommissioned — this app will not function against them indefinitely. You are free to fork, adapt, and self-host it (see the license).

The web application for the **NFTfi protocol** — peer-to-peer, NFT-collateralized lending on Ethereum. Built with **React + TypeScript + Vite**.

---

## Status & scope

This snapshot is release **`v3.3.0`** (the loan-extension release). As of this tag the app already includes the **"maintenance mode"** changes shipped in `v3.2.8`, so the following are **already in effect** in this code:

- A **sunset / announcement banner** with NFTfi-specific messaging.
- A **30-day maximum** offer duration (offers above it are shown as invalid).
- **Cross-protocol refinancing disabled** — `CROSS_PROTOCOL_REFI_ENABLED = false` in `src/constants.ts`.
- **Gated "offers split"** behaviour on the Get-a-Loan page (`OFFERS_SPLIT_ENABLED` in `src/pages/borrow/GetALoanPage.tsx`).

If you fork this, you'll likely want to review or remove those — see `src/constants.ts` and `src/components/Alert/AnnouncementBanner.tsx`.

## What it does

Browse the loan market, borrow against NFTs, lend / make offers, refinance NFTfi loans, repay, foreclose defaulted loans (lender), extend loans, and view account history.

## Requirements

- **Node 20+** and **Yarn (Classic, 1.x)**. Dependencies (including the `@nftfi/js` SDK) install via `yarn install`.
- A **backend**: the app expects the NFTfi SDK-API plus a **same-origin proxy** that fronts third-party services (Alchemy, OpenSea) and injects their keys server-side (reference config in `nginx/proxy.locations`). NFTfi's hosted versions are being shut down, so **you must supply your own** backend/proxy (or adapt the app to talk to the contracts directly).

## Setup

```bash
cp .env.sample .env      # then fill in values
yarn install
yarn dev                 # local dev server
```

- **`.env`** — the app reads its config from these vars. `.env.sample` is a complete, commented template; `src/config/buildConfig.ts` is the authoritative source of what each var does.
- Other scripts: `yarn build` (production bundle → `dist/`), `yarn typecheck`, `yarn lint`, `yarn test`.

## Deployment

`yarn build` emits a static SPA in `dist/`. Serve it behind a reverse proxy that injects your API keys server-side — a reference **nginx** config is in `nginx/` (`dapp-ns.conf` + `proxy.locations`). The deploy-time proxy variables (`REACT_APP_ALCHEMY_API_*`, `REACT_APP_OPENSEA_API_*`) are listed in `.env.sample`.

## Known limitations

- **Backend dependency:** relies on the NFTfi SDK-API and proxy, which are being decommissioned. Without your own backend/proxy the app will not load live data.
- **NFTfi-specific content:** ships with the sunset banner and the maintenance-mode gates listed above.
- **Test coverage:** unit tests cover utilities and data conversion (~162 tests); there is no component/e2e coverage in this repo.
- **Mock data:** `src/services/mocks/` (MSW) contains only synthetic placeholder data; enable it with `VITE_ACTIVATE_MSW=true` for offline UI work.

## License

Released under the [MIT License](./LICENSE).

## Trademark & branding

This license covers the **source code only**. "NFTfi", the NFTfi name, and any NFTfi logos or brand assets are trademarks of their respective owner and are **not** licensed for use. Please **remove NFTfi branding** before redeploying a fork.

## Support

**None.** This repository is archived and provided as-is. Issues and pull requests are not monitored.
