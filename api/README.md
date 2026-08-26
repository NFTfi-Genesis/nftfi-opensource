# NFTfi SDK API

> ⚠️ **Archived / unmaintained.** This is a point-in-time snapshot (release **`v2.48.1`**) of the NFTfi SDK-API, open-sourced as the NFTfi project winds down. It is provided **as-is, with no support, maintenance, warranties, or guarantees**. NFTfi's hosted infrastructure is being decommissioned, and this service depends on external providers you must supply yourself (an Ethereum JSON-RPC endpoint, Alchemy, OpenSea, Chainalysis, SendGrid, and others). You are free to fork, adapt, and self-host it (see the license).

An NFT lending marketplace API built with [NestJS](https://nestjs.com/) inside an [Nx](https://nx.dev/getting-started/intro) monorepo. It tracks loan lifecycle events across the NFTfi and Gondi protocols, and exposes REST APIs backed by PostgreSQL, Redis and RabbitMQ.

## Prerequisites

| Requirement | Version | Notes |
| ----------- | ------- | ----- |
| Node.js | >= 20.11.0 | Only needed for `yarn install` and the TypeORM CLI — the services themselves run inside containers. |
| Yarn | 1.x (classic) | |
| Docker | with Compose v2 | Docker Desktop on macOS/Windows. The daemon must be running. |
| An Ethereum JSON-RPC endpoint | — | Alchemy, Infura or similar. Required: the loans, offers, assets and accounts services will not start without one. |

## Local development with Docker Compose

The whole stack runs in Docker: five services, an nginx gateway that emulates the production ingress, plus PostgreSQL, Redis, RabbitMQ and MailHog. Source is bind-mounted into the containers, so edits on your host trigger a reload without an image rebuild.

### 1. Create the Docker network

Compose expects the `nftfi` network to already exist (it is declared `external`), so create it once. Without it, every `up` fails with `network nftfi declared as external, but could not be found`.

```bash
docker network create nftfi
```

### 2. Install dependencies

```bash
yarn install
```

The `postinstall` hook runs `yarn init:services`, which creates an empty `.env` next to each service's `sample.env`. These files are gitignored and are where your local overrides go.

### 3. Fill in the secrets

Each service loads `sample.env` first and then its `.env`, so anything you put in `.env` wins. `sample.env` ships committed defaults that point at the containerized infrastructure (`postgres:5432`, `redis:6379`, `rabbitmq:5672`) — leave those alone. Only the values marked `<secret>` need replacing:

| File | Variables you must set |
| ---- | ---------------------- |
| `components/services/loans/.env` | `ETHEREUM_PROVIDER_URL` |
| `components/services/offers/.env` | `ETHEREUM_PROVIDER_URL`, `JWT_SECRET` |
| `components/services/accounts/.env` | `ETHEREUM_PROVIDER_URL`, `CHAINALYSIS_API_KEY` |
| `components/services/assets/.env` | `ETHEREUM_PROVIDER_URL`, `ALCHEMY_API_KEY`, `OPENSEA_API_KEY`, `ASSETS_BUCKET` |
| `components/services/notifications/.env` | none — email goes to MailHog locally; `MAILER_SENDGRID_API_KEY` and `DISCORD_BOT_TOKEN` are only needed to exercise those integrations |

For example, `components/services/loans/.env`:

```bash
# OVERRIDE VARIABLES HERE
ETHEREUM_PROVIDER_URL=https://eth-mainnet.g.alchemy.com/v2/<your-key>
```

The `accounts` and `offers` services need a matching `JWT_SECRET` if you intend to call authenticated endpoints across both.

`~/.config/gcloud` is mounted into the service containers for GCP Secret Manager access. Local development does not require it; if the directory does not exist, Docker creates an empty one and the mount is inert.

### 4. Start the stack

```bash
yarn start:dev          # builds the base image if it is missing, then brings everything up
yarn start:dev -b       # force a rebuild of the base image first
```

The first run builds `nftfiapi-services-base`, which compiles native dependencies and installs Chromium — expect several minutes. Subsequent runs reuse the image.

Rebuild with `-b` whenever `package.json` or `yarn.lock` changes; the image bakes in `node_modules`, and a bind mount will not pick up new packages.

`yarn serve:core` is the alternative entry point: it starts only the `core` profile (the five services and the gateway) with `--force-recreate`, and assumes the base image already exists.

### 5. Create the database schema

The containers connect to Postgres but do not create tables — `synchronize` is off and this repository ships no migrations. Point the TypeORM CLI at the containerized database from your host and sync the schema from the entity definitions.

Add to the root `.env`:

```bash
POSTGRES_TARGET_URI=postgres://root:admin1234@localhost:5432/nftfi
```

Then:

```bash
yarn typeorm:cli schema:sync -d ./components/repositories/src/postgres/datasource-cli.ts
```

Note the host differs by context: `postgres` inside the Docker network, `localhost:5432` from your host.

Once migrations are added under `components/migrations/`, use `yarn typeorm:migration:run` instead — it reads the same `POSTGRES_TARGET_URI`.

### 6. Verify

```bash
docker compose ps                    # every core service should be "Up"
docker compose logs -f loans         # follow a single service
curl http://localhost:8080/loans     # through the nginx gateway
```

## Ports

| Endpoint | URL | Notes |
| -------- | --- | ----- |
| API gateway (nginx) | http://localhost:8080 | Routes `/loans`, `/offers`, `/accounts` and their versioned prefixes. Use this rather than the per-service ports. |
| loans | http://localhost:8070 | |
| offers | http://localhost:8060 | |
| accounts | http://localhost:8100 | |
| assets | http://localhost:8110 | |
| notifications | http://localhost:8015 | |
| PostgreSQL | localhost:5432 | `root` / `admin1234`, database `nftfi` |
| Redis | localhost:6389 | Mapped off the default port to avoid clashing with a local Redis. |
| RabbitMQ | localhost:5672 | Management UI at http://localhost:15672 (`guest` / `guest`) |
| MailHog | http://localhost:8025 | Catches all outbound email; SMTP on 1025. |

## Everyday commands

```bash
docker compose logs -f <service>     # follow logs (loans, offers, accounts, assets, notifications)
docker compose restart <service>     # restart one service
docker compose down                  # stop everything, keep data
docker compose down && rm -rf docker/data   # stop and wipe Postgres/Redis/RabbitMQ state
```

Container state lives in `docker/data/` (gitignored). Deleting it resets the database — re-run the schema sync afterwards.

## Working outside Docker

To run a single service on your host, override its `.env` to reach the infrastructure through the published ports:

```bash
POSTGRES_URI=postgres://root:admin1234@localhost:5432/nftfi
REDIS_URI=redis://localhost:6389/
RABBITMQ_URL=amqp://localhost:5672/
```

Then start the infrastructure containers and serve the service from your host:

```bash
docker compose up -d postgres redis rabbitmq mailhog
yarn nx serve services-loans
```

## Other Nx commands

```bash
yarn build                           # build every component
yarn nx serve <component-name>       # serve one component
yarn test                            # all tests
yarn test --testPathPattern=loans    # tests for one service
yarn lint                            # eslint
yarn lint:types                      # type-check
```

## Tools

```bash
yarn nx serve <tool-name> --args="--help"
```

## Troubleshooting

**`network nftfi declared as external, but could not be found`** — run `docker network create nftfi` (step 1).

**A service exits immediately on startup** — check `docker compose logs <service>`. The usual cause is a `<secret>` placeholder left unreplaced, most often `ETHEREUM_PROVIDER_URL`.

**`relation "..." does not exist`** — the schema was never created, or `docker/data` was wiped. Re-run step 5.

**`Cannot find module` after pulling changes** — dependencies changed and the base image is stale. Run `yarn start:dev -b`.

**Port already in use** — something on the host is holding 8080, 5432 or 5672. Stop it, or change the host side of the mapping in `docker-compose.yml`.

## Status & scope

This snapshot is release **`v2.48.1`**. It is the backend for the NFTfi protocol — peer-to-peer, NFT-collateralized lending on Ethereum — and the counterpart to the [frontend dApp](../frontend). It tracks loan and offer lifecycle events across NFTfi (V1–V3.1) and Gondi (V1–V3.1), and serves them through versioned REST APIs behind an nginx gateway.

The service ships configured for NFTfi's own deployment (mainnet contract addresses, GCP Secret Manager, the microservice topology described above). If you fork it you'll want to review the per-service `src/config.ts` files and contract/replay-block settings before pointing it at your own infrastructure.

## Known limitations

- **External dependencies:** the services will not run without an Ethereum JSON-RPC endpoint, and the `assets`, `accounts` and `notifications` services additionally need Alchemy, OpenSea, Chainalysis and SendGrid/Discord credentials respectively. All of these are `<secret>` placeholders in each service's `sample.env` — you must supply your own.
- **No migrations shipped:** this repository has no committed migrations; the schema is synced from the TypeORM entities via `schema:sync` (see step 5). Production would generate and run migrations under `components/migrations/`.
- **NFTfi-specific configuration:** contract addresses, replay blocks and secret-manager wiring reflect NFTfi's production deployment and are not generic.
- **Secrets management:** in production, secrets are loaded from **GCP Secret Manager**, not from `.env` files. The committed `sample.env` values are local-development defaults only.

## License

Released under the [MIT License](./LICENSE).

## Trademark & branding

This license covers the **source code only**. "NFTfi", the NFTfi name, and any NFTfi logos or brand assets are trademarks of their respective owner and are **not** licensed for use. Please **remove NFTfi branding** before redeploying a fork.

## Support

**None.** This repository is archived and provided as-is. Issues and pull requests are not monitored.
