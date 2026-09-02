# Fork Tests

The fork tests are some of the highest-value tests in the repo because they validate assumptions against real mainnet state and external integrations.

They live under `test/forkTest/`.

## Most Important Fork Suites

### NFTfi refinance flow on fork

- `test/forkTest/refinancing-test.ts`

This is the main fork-based refinance anchor for NFTfi-native and legacy refinance paths. It is the closest test analog to how the production refinance surface is expected to behave against live token and contract assumptions.

### External refinancing adapters

- `test/forkTest/arcade-refinancing-test.ts`
- `test/forkTest/blend-refinancing-test.ts`
- `test/forkTest/gondi-refinancing-test.ts`
- `test/forkTest/gondi-3-1-refinancing-test.ts`

These matter because the external adapters are where protocol assumptions meet third-party contracts, live assets, and integration-specific data formats.

If an adapter change is risky, these are the first tests to inspect.

### Delegate cash and custody edge cases

- `test/forkTest/delegate-cash.ts`
- `test/forkTest/super-rare-v1-personal-escrow.ts`
- `test/forkTest/punk-wrapper.ts`
- `test/forkTest/kitties-collection-offer-non-zero-id.ts`

These cover high-friction edge cases:

- delegated collateral rights while collateral is escrowed
- personal escrow behavior with live collections
- non-standard NFT formats and wrappers

## Why Fork Tests Matter Here

The refinance system depends on more than repo-owned contracts.

It depends on:

- real external loan contracts
- live token behavior
- live NFT contracts
- swap and flashloan assumptions

Those are exactly the places where purely local unit tests can miss integration failures.

## Forking Assumptions

The repo’s `hardhat.config.ts` hardcodes a mainnet fork block for the `hardhat` network:

- block `21037753`

That means fork tests are designed around a stable historical snapshot rather than the moving live head.

This is good for reproducibility, but it also means new external-protocol changes after that block are not automatically reflected.
