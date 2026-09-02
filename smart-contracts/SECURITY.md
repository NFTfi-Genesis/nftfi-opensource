# Security policy

## Reporting

Do not disclose an unpatched vulnerability in a public issue. Report it through NFTfi's current private security
contact or bug-bounty channel before public discussion.

## Publication and release safety

- Never commit `.env` files, deployer keys, owner keys, RPC credentials, explorer keys, Tenderly tokens, or Safe data.
- Run both Gitleaks and TruffleHog against the complete release candidate before publication.
- Review dependency advisories and pin the release toolchain.
- Treat deployment artifacts as public chain data, but still review metadata and test fixtures for unrelated private
  infrastructure or personal data.
- `scripts/verifyMainnetState.ts` is read-only. Deployment and maintenance scripts may broadcast transactions.

Local secret scans require `gitleaks` and `trufflehog` on `PATH`:

```bash
yarn security:secrets
yarn security:secrets:trufflehog
```

The TruffleHog filesystem scan excludes the pinned `forge-std` submodule because that public upstream repository
contains its own well-known example provider values. The NFTfi repository stores only the submodule URL and commit.
Gitleaks still scans the NFTfi source tree, deployment artifacts, tests, scripts, documentation, and configuration.

## Supported code

The machine-readable supported/deployed inventory is `mainnet-contract-manifest.json`. Historical contracts remain in
that inventory when they are needed to service or refinance existing loans, even when new origination is paused.
