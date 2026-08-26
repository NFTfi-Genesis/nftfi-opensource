# AGENTS.md

Guidance for AI agents working in this codebase.

---

## Project Overview

This is an **NFT lending marketplace API** built with **NestJS** in an **Nx monorepo**. It monitors blockchain events across multiple protocols (NFTfi, Gondi), processes loan lifecycle data, and exposes REST APIs backed by PostgreSQL and Redis. Services communicate via RabbitMQ RPC.

**Stack:** NestJS 10 · TypeScript 5.5 · Nx 18 · TypeORM · Ethers.js v5 · RabbitMQ · Redis

---

## Repository Layout

```
components/
  core/           # Shared utilities, DTOs, decorators, interceptors
  facades/        # RabbitMQ RPC facade modules (assets, fx-rates, notifications…)
  modules/        # Reusable NestJS modules (auth, cache, ethers-observer…)
  repositories/   # TypeORM data-access layer
  services/       # Independently deployable microservices (see below)
  tools/          # CLI tools (migration, market-loans-restorer…)
  migrations/     # TypeORM database migrations
  validation/     # Custom validation pipes and class-validator decorators
docker/           # Dockerfile templates
scripts/          # Bootstrap scripts (service-init.sh)
architecture/     # Draw.io architecture diagrams
```

---

## Microservices

| Service                         | Path                                   | Responsibility                                                                                         |
| ------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| **loans**                       | `services/loans`                       | Loan lifecycle tracking across NFTfi V1–V3.1 and Gondi V1–V3.1; blockchain event subscribers; REST API |
| **offers**                      | `services/offers`                      | Lending offers V01–V03; creation, expiry, notifications                                                |
| **accounts**                    | `services/accounts`                    | User account CRUD; JWT auth; contact info                                                              |
| **assets**                      | `services/assets`                      | NFT metadata, collection stats, floor prices, FX rates; publisher to other services                    |
| **notifications**               | `services/notifications`               | Email (SendGrid/nodemailer) and Discord notifications; template rendering                              |
| **api-discovery**               | `services/api-discovery`               | Swagger/OpenAPI aggregation across services                                                            |

---

## Key Architectural Patterns

### Blockchain Event Subscribers

Each contract version has a dedicated subscriber class decorated with `@Contract()` and `@Subscriber()` from `ethers-observer`. Subscribers live under `services/loans/src/subscribers/`. When adding support for a new contract version, follow the existing pattern (e.g., `NftfiLoanV31Subscriber`).

### Facade Pattern

Cross-service calls go through facade modules in `components/facades/`. Facades wrap RabbitMQ `ClientRMQ` with typed request/response. Never call another service's HTTP endpoint directly from within a service—use the facade.

### Repository Pattern

Data access is isolated in `components/repositories/`. Each entity has a dedicated repository class extending TypeORM's `Repository`. Complex filters are built with `QueryBuilder`. Do not put query logic in services.

### DTO / Serialization

All API responses use class-transformer `@Expose()` / `@Exclude()` on DTO classes. Controllers use `ClassSerializerInterceptor`. Validation uses `class-validator` with custom decorators (`@IsWeiString`, `@IsGreaterThan`) from `components/validation/`.

### Versioned APIs

Loan and offer controllers are versioned (`V01Controller`, `V1Controller`, `V23Controller`, etc.). When modifying behavior, identify the correct version controller and service before editing. Avoid touching multiple versions unless the change applies to all.

---

## Coding Conventions

- **Module structure**: Each service has `src/app.module.ts` as root. Shared logic must go to `components/core` or a new library—not duplicated across services.
- **Config**: Each service has `src/config.ts` exporting a typed config object built from `process.env`. Add new env vars there first.
- **Caching**: Use `CacheModule` from `components/modules/cache`. Default TTL is 1 minute for loan endpoints. Always invalidate or set appropriate TTLs.
- **Scheduling**: Use `@nestjs/schedule` decorators (`@Cron`, `@Interval`). Cron strings follow standard cron syntax.
- **Error handling**: Throw `HttpException` subclasses from controllers/services. Use `UnprocessableEntityException` for validation errors. RPC errors use the RPC-specific filter in `components/core`.
- **Logging**: Use NestJS `Logger` injected per class. Do not use `console.log` in production code.
- **Transactions**: Wrap multi-entity writes in TypeORM `QueryRunner` transactions.
- **Ethereum values**: Store and compute amounts as `BigNumber` (Wei). Never use floating-point arithmetic for on-chain values.
- **TypeScript types**: `any` and `never` are forbidden. Every value must have an explicit, meaningful type. Reuse existing types and interfaces from the codebase rather than redeclaring equivalent shapes.
- **Semantic naming**: Method, type, and topic names must express the domain operation, not the caller's intent or implementation side-effects. Prefer `deleteByNftKey({ nftContract, nftTokenId })` over `deleteOffersForAsset(nftContract, nftTokenId)`; prefer `findByBorrower` over `getBorrowerOffersList`. When you modify a function, rename it if a clearer name exists, and propagate the rename through callers, types, queue topics, and tests in the same change — do not leave the codebase with mixed naming.
- **Comments**: Do not write comments that restate what self-explanatory code already says, especially for short, simple blocks. Let clear names and types carry the meaning. Comment only the non-obvious: rationale ("why"), edge cases, gotchas, or constraints that aren't visible in the code itself.

---

## Database

| Store      | Usage                                               | Connection                             |
| ---------- | --------------------------------------------------- | -------------------------------------- |
| PostgreSQL | Loans, collections, events, FX rates, notifications | TypeORM; `POSTGRES_URI` env var        |
| Redis      | Response caching, distributed semaphore locks       | ioredis; `REDIS_URI`                   |

**Migrations** live in `components/migrations/`. Generate with:

```bash
yarn typeorm:cli migration:generate -- --name=<MigrationName>
```

Always run `yarn typeorm:migration:run` after creating a migration. Never modify committed migration files.

---

## Testing

- **Framework**: Jest + ts-jest. Config: `jest.config.js` at root.
- **Pattern**: Unit tests co-located as `*.test.ts`; E2E tests as `*.e2e-test.ts`.
- **Coverage targets**: All code paths, branches, and functions must be covered. Aim for the highest possible coverage — do not leave untested logic.
- **All repositories are mocked — no real database connections in any test.** Use `jest.fn()` per method or the shared factory helpers:
  - `createTypeormRepositoryMock<Entity>()` — returns a fully mocked `Repository<T>` (upsert, findOne, save, create, find, createQueryBuilder, etc.)
  - `createTypeormQueryBuilderMock<T>()` — returns a fluent mock `SelectQueryBuilder<T>` where every method returns `this`, enabling chain assertions
  - Both helpers live in `components/repositories/test/factories/typeorm.factory.ts`
- When injecting a TypeORM repository into `Test.createTestingModule()`, use `getRepositoryToken(Entity)` as the provider token:
  ```typescript
  { provide: getRepositoryToken(MarketLoan), useValue: createTypeormRepositoryMock<MarketLoan>() }
  ```
- For custom repository classes (e.g. `MarketLoanRepository`), inject them directly by class and supply a `useValue` object with `jest.fn()` for each method the test exercises.
- Always call `jest.resetAllMocks()` in `beforeEach` to prevent state leakage between tests.
- Use `@nestjs/testing` `Test.createTestingModule()` for module-level tests.
- Test data is built with factory helpers in `test/` directories (e.g. `market-loan.factory.ts`); prefer these over inline literals.
- **`expect` statements must use exact literal values** — never reference variables or factory outputs in assertions. Hard-code the expected string, number, or object so the assertion is self-documenting and cannot pass vacuously.
  ```typescript
  // correct
  expect(result.principal).toBe('1000000000000000000');
  // wrong
  expect(result.principal).toBe(loan.principal);
  ```

Run tests:

```bash
yarn test                     # All tests
yarn test --testPathPattern=loans  # Scoped to a service
```

---

## Common Tasks

### Adding a new contract version subscriber

1. Create `services/loans/src/subscribers/nftfi-loan-v<X>-subscriber.ts` following existing subscriber files.
2. Register it in the subscribers module (`LoanSubscribersModule`).
3. Add the contract address and replay block to the service config.
4. Write a unit test for the subscriber.

### Adding a new API endpoint

1. Define the DTO in the relevant service's `dto/` directory using class-validator decorators.
2. Add the route to the controller with Swagger decorators (`@ApiOperation`, `@ApiOkResponse`).
3. Implement business logic in the service, delegating data access to the repository.
4. Add or update the relevant `@ApiTags` grouping.

### Adding a new migration

```bash
yarn typeorm:migration:generate components/migrations/src/postgres/<MigrationName>
yarn typeorm:migration:run
```

### Running locally

```bash
yarn start:dev          # Starts all core services via Docker Compose
yarn serve:core         # Core services profile only
```

---

## Environment Variables

Each service reads from a `.env` file. A `sample.env` template is auto-created by `scripts/service-init.sh` on first run. Key variables:

| Variable                     | Purpose                                |
| ---------------------------- | -------------------------------------- |
| `POSTGRES_URI`               | PostgreSQL connection string           |
| `REDIS_URI`                  | Redis connection                       |
| `RABBITMQ_URL`               | RabbitMQ connection                    |
| `ETHEREUM_PROVIDER_URL`      | JSON-RPC endpoint (Alchemy/Infura)     |
| `ETHEREUM_EVENTS_REPLAY`     | Enable/disable historical event replay |
| `PORT`                       | HTTP server port for the service       |

Secrets in production are managed via **GCP Secret Manager**—do not hardcode credentials.

---

## CI/CD

| Workflow                      | Trigger          | Purpose                          |
| ----------------------------- | ---------------- | -------------------------------- |
| `ci.yml`                      | PR / push        | Lint, type-check, tests          |
| `image-build-nftfi.yaml`      | Merge to main    | Build and push Docker images     |
| `market-loans-restore.yaml`   | Manual           | Historical loan data restoration |

---

## Out of Scope for Agents

- Do **not** modify committed migration files.
- Do **not** change contract addresses or replay block numbers without explicit instruction—these are consensus-critical.
- Do **not** bypass auth guards or remove security decorators.
- Do **not** push directly to `main`; always open a PR.
- Do **not** add a `Co-Authored-By: Claude` trailer (or any AI co-author/attribution line) to commit messages.
